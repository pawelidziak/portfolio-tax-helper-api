import { TradeAction, TaxSummary } from '@shared/models';
import { roundToDecimals } from '@utils';
import { IBKRTradeDto } from '@ibkr';

/**
 * ============================================
 *        UNIFIED TRADE TAX ENGINE (PL)
 * ============================================
 *
 * NEW (TAX) SEMANTICS:
 * --------------------------------------------
 * 1) Revenue (PIT) ALWAYS GROSS:
 *    - LONG: sale price * quantity
 *    - SHORT: full opening premium * quantity
 *
 * 2) Cost (PIT) includes:
 *    - LONG:
 *        * purchase price (gross, excluding commission) * quantity
 *        * + OPENING commission of the long
 *        * + CLOSING commission of the long
 *    - SHORT:
 *        * buyback price * quantity
 *        * + OPENING commission of the short
 *        * + CLOSING commission of the short
 *
 * 3) Income (PIT) = revenue - cost
 *
 * 4) A taxable event arises ONLY on closing
 *    (CLOSE_LONG / CLOSE_SHORT, partially or fully).
 *    Pure openings (BUY long / SELL short, when they close nothing)
 *    do not generate a TaxSummary (we return {0,0,0}), but the commission
 *    is remembered on the fly and will be added to the cost
 *    on closing.
 *
 * 5) A LOT stores:
 *    - qty: positive = long, negative = short
 *    - pricePerLotPLN: base price (gross, excluding commission) per unit
 *        * LONG: purchase price
 *        * SHORT: gross opening premium
 *    - openCommissionPerLotPLN: opening commission per unit
 *        * used on closing to add it to the cost
 */

// ============================================
//            INTERFACES & TYPES
// ============================================

interface Lot {
  /** Quantity: positive = long, negative = short */
  qty: number;
  /**
   * BASE price per unit in PLN (GROSS, excluding commission):
   *  - for LONG: purchase price
   *  - for SHORT: gross opening premium
   */
  pricePerLotPLN: number;
  /**
   * OPENING commission per unit (PLN)
   *  - for LONG: commission from BUY
   *  - for SHORT: commission from SELL
   *
   * It is added to the cost on closing (proportionally
   * to the quantity being closed).
   */
  openCommissionPerLotPLN: number;
}

interface TradeConfig {
  /** Price multiplier (1 for stocks, 100 for options) */
  multiplier: number;
}

type CloseResult = TaxSummary;

// ============================================
//            MAIN CLASS
// ============================================

export class TradeTaxEngine {
  private readonly _lotsBySymbol = new Map<string, Lot[]>();
  private readonly _config: TradeConfig;

  constructor(config: TradeConfig) {
    this._config = config;
  }

  public processTrade(
    trade: IBKRTradeDto,
    fxRatePLN: number
  ): { actions: TradeAction[]; quantityAfter: number; tax: TaxSummary } {
    const EMPTY_TAX: TaxSummary = { revenue: 0, cost: 0, income: 0 };
    const actions: TradeAction[] = [];

    if (!validateTrade(trade, fxRatePLN)) {
      const lots = this._getLots(trade.symbol);
      const quantityAfter = calculateNetPosition(lots);
      return { actions, quantityAfter, tax: EMPTY_TAX };
    }

    const { symbol, quantity, tradePrice, commissionFee } = trade;
    const lots = this._getLots(symbol);

    const qty = Math.abs(quantity);
    const pricePLN = calculatePricePLN(tradePrice, fxRatePLN, this._config.multiplier);
    const commissionPLN = calculateCommissionPLN(commissionFee, fxRatePLN);

    let tax: TaxSummary = EMPTY_TAX;

    // BUY (quantity > 0) → close shorts, possibly open a long
    if (quantity > 0) {
      tax = this._processBuy(lots, symbol, qty, pricePLN, commissionPLN, actions);
    }

    // SELL (quantity < 0) → close longs, possibly open a short
    if (quantity < 0) {
      tax = this._processSell(lots, symbol, qty, pricePLN, commissionPLN, actions);
    }

    const quantityAfter =
      actions.length > 0 ? actions[actions.length - 1].afterQty : calculateNetPosition(lots);

    return { actions, quantityAfter, tax };
  }

  /**
   * BUY:
   *  - if there are shorts → close them (partially/fully) using FIFO,
   *                      part of the commission goes to the closing cost,
   *                      the rest to new longs (as openCommissionPerLot).
   *  - if there are no shorts → open a long (the commission goes to the lot).
   */
  private _processBuy(
    lots: Lot[],
    symbol: string,
    qty: number,
    pricePerLotPLN: number,
    commissionPLN: number,
    actions: TradeAction[]
  ): TaxSummary {
    const EMPTY: TaxSummary = { revenue: 0, cost: 0, income: 0 };
    const totalShort = calculateTotalShort(lots);

    // Shorts exist → close them first
    if (totalShort > 0) {
      const qtyToClose = Math.min(totalShort, qty);
      const qtyToOpenLong = qty - qtyToClose;

      // Commission split: part to the close, part to new longs
      // Round to 2 decimal places
      const commissionForClose =
        qtyToClose > 0 ? roundToDecimals((commissionPLN * qtyToClose) / qty) : 0;
      const commissionForOpen = roundToDecimals(commissionPLN - commissionForClose);

      // Close shorts (excluding the closing commission - added below)
      const closeRes = closeShorts(lots, symbol, qtyToClose, pricePerLotPLN, actions);

      // CLOSING commission of the short → tax cost
      if (commissionForClose !== 0) {
        closeRes.cost = (closeRes.cost ?? 0) + commissionForClose;
      }

      // Excess → open a long (opening commission on the fly)
      if (qtyToOpenLong > 0) {
        const openCommissionPerLotPLN =
          commissionForOpen !== 0 ? roundToDecimals(commissionForOpen / qtyToOpenLong) : 0;
        openLong(lots, symbol, qtyToOpenLong, pricePerLotPLN, openCommissionPerLotPLN, actions);
      }

      // Round the final results to 2 decimal places
      closeRes.revenue = roundToDecimals(closeRes.revenue ?? 0);
      closeRes.cost = roundToDecimals(closeRes.cost ?? 0);
      closeRes.income = roundToDecimals(closeRes.revenue - closeRes.cost);
      return closeRes;
    }

    // No shorts → pure long opening (no taxable event)
    if (qty > 0) {
      const openCommissionPerLotPLN =
        commissionPLN !== 0 ? roundToDecimals(commissionPLN / qty) : 0;
      openLong(lots, symbol, qty, pricePerLotPLN, openCommissionPerLotPLN, actions);
    }

    return EMPTY;
  }

  /**
   * SELL:
   *  - if there are longs → close them using FIFO,
   *                     part of the commission goes to the closing cost,
   *                     the rest to new shorts (as openCommissionPerLot).
   *  - if there are no longs → open a short (commission on the fly).
   */
  private _processSell(
    lots: Lot[],
    symbol: string,
    qty: number,
    pricePerLotPLN: number,
    commissionPLN: number,
    actions: TradeAction[]
  ): TaxSummary {
    const EMPTY: TaxSummary = { revenue: 0, cost: 0, income: 0 };
    const totalLong = calculateTotalLong(lots);

    // Longs exist → close them first
    if (totalLong > 0) {
      const qtyToClose = Math.min(totalLong, qty);
      const qtyToOpenShort = qty - qtyToClose;

      // Commission split: part to the close, part to new shorts
      // Round to 2 decimal places
      const commissionForClose =
        qtyToClose > 0 ? roundToDecimals((commissionPLN * qtyToClose) / qty) : 0;
      const commissionForOpen = roundToDecimals(commissionPLN - commissionForClose);

      // Close longs (excluding the closing commission - added below)
      const closeRes = closeLongs(lots, symbol, qtyToClose, pricePerLotPLN, actions);

      // CLOSING commission of the long → tax cost
      if (commissionForClose !== 0) {
        closeRes.cost = (closeRes.cost ?? 0) + commissionForClose;
      }

      // Excess → open a short (opening commission on the fly)
      if (qtyToOpenShort > 0) {
        const openCommissionPerLotPLN =
          commissionForOpen !== 0 ? roundToDecimals(commissionForOpen / qtyToOpenShort) : 0;
        openShort(lots, symbol, qtyToOpenShort, pricePerLotPLN, openCommissionPerLotPLN, actions);
      }

      // Round the final results to 2 decimal places
      closeRes.revenue = roundToDecimals(closeRes.revenue ?? 0);
      closeRes.cost = roundToDecimals(closeRes.cost ?? 0);
      closeRes.income = roundToDecimals(closeRes.revenue - closeRes.cost);
      return closeRes;
    }

    // No longs → pure short opening (no taxable event)
    if (qty > 0) {
      const openCommissionPerLotPLN =
        commissionPLN !== 0 ? roundToDecimals(commissionPLN / qty) : 0;
      openShort(lots, symbol, qty, pricePerLotPLN, openCommissionPerLotPLN, actions);
    }

    return EMPTY;
  }

  /** Gets or creates the lots array for a symbol */
  private _getLots(symbol: string): Lot[] {
    let lots = this._lotsBySymbol.get(symbol);
    if (!lots) {
      lots = [];
      this._lotsBySymbol.set(symbol, lots);
    }
    return lots;
  }
}

// ============================================
//            HELPER FUNCTIONS
// ============================================

/**
 * Closes shorts using FIFO.
 *
 * For each short lot:
 *  - lot.pricePerLotPLN          = GROSS premium per unit
 *  - lot.openCommissionPerLotPLN = OPENING commission per unit
 *
 * On closing:
 *  - revenue += qty * lot.pricePerLotPLN
 *  - cost    += qty * closePricePLN
 *  - cost    += qty * lot.openCommissionPerLotPLN   (opening commission)
 *  The CLOSING commission is added higher up in _processBuy.
 */
const closeShorts = (
  lots: Lot[],
  symbol: string,
  qtyToClose: number,
  closePricePerLotPLN: number,
  actions: TradeAction[]
): CloseResult => {
  let remaining = qtyToClose;
  let revenue = 0;
  let cost = 0;

  let netPosition = calculateNetPosition(lots);

  for (let i = 0; i < lots.length && remaining > 0; i++) {
    const lot = lots[i];
    if (lot.qty >= 0) continue; // skip longs

    const shortQty = Math.abs(lot.qty);
    const closeQty = Math.min(remaining, shortQty);
    if (closeQty <= 0) continue;

    const beforeQty = netPosition;

    // Revenue: full opening premium (GROSS)
    revenue += closeQty * lot.pricePerLotPLN;

    // Cost: buyback at the current price + OPENING commission
    cost += closeQty * closePricePerLotPLN;
    cost += closeQty * lot.openCommissionPerLotPLN;

    // Update the lot and position
    lot.qty += closeQty; // the short moves toward zero
    netPosition += closeQty;

    const afterQty = netPosition;

    actions.push({
      type: 'CLOSE_SHORT',
      symbol,
      qty: closeQty,
      tradePricePerLotPLN: closePricePerLotPLN,
      lotPricePerLotPLN: lot.pricePerLotPLN,
      beforeQty,
      afterQty,
    });

    remaining -= closeQty;
  }

  // Remove empty lots from the front
  while (lots.length > 0 && lots[0].qty === 0) {
    lots.shift();
  }

  // Round the results to 2 decimal places (per tax practice)
  revenue = roundToDecimals(revenue);
  cost = roundToDecimals(cost);
  const income = roundToDecimals(revenue - cost);

  return { revenue, cost, income };
};

/**
 * Closes longs using FIFO.
 *
 * For each long lot:
 *  - lot.pricePerLotPLN          = purchase price (GROSS, excluding commission)
 *  - lot.openCommissionPerLotPLN = OPENING commission per unit
 *
 * On closing:
 *  - revenue += qty * closePricePLN
 *  - cost    += qty * lot.pricePerLotPLN
 *  - cost    += qty * lot.openCommissionPerLotPLN   (opening commission)
 *  The CLOSING commission is added higher up in _processSell.
 */
const closeLongs = (
  lots: Lot[],
  symbol: string,
  qtyToClose: number,
  closePricePerLotPLN: number,
  actions: TradeAction[]
): CloseResult => {
  let remaining = qtyToClose;
  let revenue = 0;
  let cost = 0;

  let netPosition = calculateNetPosition(lots);

  for (let i = 0; i < lots.length && remaining > 0; i++) {
    const lot = lots[i];
    if (lot.qty <= 0) continue; // skip shorts

    const closeQty = Math.min(remaining, lot.qty);
    if (closeQty <= 0) continue;

    const beforeQty = netPosition;

    // Revenue: sale of the long at the current price
    revenue += closeQty * closePricePerLotPLN;

    // Cost: purchase price + OPENING commission (proportional)
    cost += closeQty * lot.pricePerLotPLN;
    cost += closeQty * lot.openCommissionPerLotPLN;

    // Update the lot and position
    lot.qty -= closeQty;
    netPosition -= closeQty;

    const afterQty = netPosition;

    actions.push({
      type: 'CLOSE_LONG',
      symbol,
      qty: closeQty,
      tradePricePerLotPLN: closePricePerLotPLN,
      lotPricePerLotPLN: lot.pricePerLotPLN,
      beforeQty,
      afterQty,
    });

    remaining -= closeQty;
  }

  // Remove empty lots from the front
  while (lots.length > 0 && lots[0].qty === 0) {
    lots.shift();
  }

  // Round the results to 2 decimal places (per tax practice)
  revenue = roundToDecimals(revenue);
  cost = roundToDecimals(cost);
  const income = roundToDecimals(revenue - cost);

  return { revenue, cost, income };
};

/** Validates the trade input data */
const validateTrade = (trade: IBKRTradeDto, fxRatePLN: number): boolean => {
  if (!fxRatePLN || fxRatePLN <= 0) return false;
  if (!trade.symbol || !trade.quantity) return false;
  if (trade.tradePrice === null || trade.tradePrice === undefined) return false;
  return true;
};

/**
 * Opens a new short position.
 *
 * - qty > 0 means the user sold qty units (short)
 * - pricePerLotPLN          = GROSS premium per unit
 * - openCommissionPerLotPLN = OPENING commission per unit
 */
const openShort = (
  lots: Lot[],
  symbol: string,
  qty: number,
  pricePerLotPLN: number,
  openCommissionPerLotPLN: number,
  actions: TradeAction[]
): void => {
  if (qty <= 0) return;

  const beforeQty = calculateNetPosition(lots);

  lots.push({ qty: -qty, pricePerLotPLN, openCommissionPerLotPLN });

  const afterQty = beforeQty - qty;

  actions.push({
    type: 'OPEN_SHORT',
    symbol,
    qty,
    tradePricePerLotPLN: pricePerLotPLN,
    beforeQty,
    afterQty,
  });
};

/**
 * Opens a new long position.
 *
 * - qty > 0
 * - pricePerLotPLN          = purchase price GROSS (excluding commission) per unit
 * - openCommissionPerLotPLN = OPENING commission per unit
 */
const openLong = (
  lots: Lot[],
  symbol: string,
  qty: number,
  pricePerLotPLN: number,
  openCommissionPerLotPLN: number,
  actions: TradeAction[]
): void => {
  if (qty <= 0) return;

  const beforeQty = calculateNetPosition(lots);

  lots.push({ qty, pricePerLotPLN, openCommissionPerLotPLN });

  const afterQty = beforeQty + qty;

  actions.push({
    type: 'OPEN_LONG',
    symbol,
    qty,
    tradePricePerLotPLN: pricePerLotPLN,
    beforeQty,
    afterQty,
  });
};

/**
 * Calculates the commission in PLN (always positive).
 * The commission is rounded to 2 decimal places (per tax practice).
 */
const calculateCommissionPLN = (
  commissionFee: undefined | number | null,
  fxRatePLN: number
): number => {
  const commission = Math.abs(commissionFee ?? 0) * fxRatePLN;
  return roundToDecimals(commission);
};

/**
 * Calculates the price in PLN, taking the multiplier into account (e.g. 100 for options).
 * The price is rounded to 2 decimal places (per tax practice).
 */
const calculatePricePLN = (tradePrice: number, fxRatePLN: number, multiplier: number): number => {
  const price = tradePrice * fxRatePLN * multiplier;
  return roundToDecimals(price);
};

/** Calculates the total short quantity (positive value) */
const calculateTotalShort = (lots: Lot[]): number => {
  return lots.filter(l => l.qty < 0).reduce((sum, lot) => sum + Math.abs(lot.qty), 0);
};

/** Calculates the total long quantity */
const calculateTotalLong = (lots: Lot[]): number => {
  return lots.filter(l => l.qty > 0).reduce((sum, lot) => sum + lot.qty, 0);
};

/** Calculates the total (signed) position for a symbol */
const calculateNetPosition = (lots: Lot[]): number => {
  return lots.reduce((sum, lot) => sum + lot.qty, 0);
};
