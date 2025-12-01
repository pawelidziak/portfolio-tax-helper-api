import { TradeAction, TaxSummary } from '@shared/models';
import { IBKRTradeDto } from '@ibkr';

/**
 * ============================================
 *        UNIFIED TRADE TAX ENGINE (PL)
 * ============================================
 *
 * NOWA SEMANTYKA (PODATKOWA):
 * --------------------------------------------
 * 1) Przychód (PIT) ZAWSZE BRUTTO:
 *    - LONG: cena sprzedaży * ilość
 *    - SHORT: pełna premia z otwarcia * ilość
 *
 * 2) Koszt (PIT) zawiera:
 *    - LONG:
 *        * cena zakupu (brutto, bez prowizji) * ilość
 *        * + prowizja OTWARCIA longa
 *        * + prowizja ZAMKNIĘCIA longa
 *    - SHORT:
 *        * cena odkupu * ilość
 *        * + prowizja OTWARCIA shorta
 *        * + prowizja ZAMKNIĘCIA shorta
 *
 * 3) Dochód (PIT) = przychód - koszt
 *
 * 4) Zdarzenie podatkowe powstaje TYLKO przy zamknięciu
 *    (CLOSE_LONG / CLOSE_SHORT, częściowo lub w całości).
 *    Czyste otwarcia (BUY long / SELL short, gdy nic nie zamykają)
 *    nie generują TaxSummary (wracamy {0,0,0}), ale prowizja
 *    jest zapamiętana w locie i zostanie doliczona do kosztu
 *    przy zamknięciu.
 *
 * 5) LOT przechowuje:
 *    - qty: dodatnia = long, ujemna = short
 *    - pricePerLotPLN: cena bazowa (brutto, bez prowizji) na 1 sztukę
 *        * LONG: cena zakupu
 *        * SHORT: premia brutto z otwarcia
 *    - openCommissionPerLotPLN: prowizja otwarcia na 1 sztukę
 *        * używana przy zamknięciu, żeby dodać ją do kosztu
 */

// ============================================
//            INTERFACES & TYPES
// ============================================

interface Lot {
  /** Ilość: dodatnia = long, ujemna = short */
  qty: number;
  /**
   * Cena BAZOWA na 1 sztukę w PLN (BRUTTO, bez prowizji):
   *  - dla LONG: cena zakupu
   *  - dla SHORT: premia brutto z otwarcia
   */
  pricePerLotPLN: number;
  /**
   * Prowizja OTWARCIA na 1 sztukę (PLN)
   *  - dla LONG: prowizja z BUY
   *  - dla SHORT: prowizja z SELL
   *
   * Jest doliczana do kosztu przy zamknięciu (proporcjonalnie
   * do zamykanej ilości).
   */
  openCommissionPerLotPLN: number;
}

interface TradeConfig {
  /** Mnożnik ceny (1 dla stocks, 100 dla options) */
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

    // BUY (quantity > 0) → zamykamy shorty, ewentualnie otwieramy longa
    if (quantity > 0) {
      tax = this._processBuy(lots, symbol, qty, pricePLN, commissionPLN, actions);
    }

    // SELL (quantity < 0) → zamykamy longi, ewentualnie otwieramy shorta
    if (quantity < 0) {
      tax = this._processSell(lots, symbol, qty, pricePLN, commissionPLN, actions);
    }

    const quantityAfter =
      actions.length > 0 ? actions[actions.length - 1].afterQty : calculateNetPosition(lots);

    return { actions, quantityAfter, tax };
  }

  /**
   * BUY:
   *  - jeśli są shorty → zamykamy (częściowo/całkowicie) shorty metodą FIFO,
   *                      prowizja częściowo idzie do kosztu zamknięcia,
   *                      reszta do nowych longów (jako openCommissionPerLot).
   *  - jeśli brak shortów → otwieramy longa (prowizja trafia do lota).
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

    // Są shorty → zamykamy je najpierw
    if (totalShort > 0) {
      const qtyToClose = Math.min(totalShort, qty);
      const qtyToOpenLong = qty - qtyToClose;

      // Dzielenie prowizji: część do zamknięcia, część do nowych longów
      const commissionForClose = qtyToClose > 0 ? (commissionPLN * qtyToClose) / qty : 0;
      const commissionForOpen = commissionPLN - commissionForClose;

      // Zamykamy shorty (bez prowizji zamknięcia – tę dodamy niżej)
      const closeRes = closeShorts(lots, symbol, qtyToClose, pricePerLotPLN, actions);

      // Prowizja ZAMKNIĘCIA shorta → koszt podatkowy
      if (commissionForClose !== 0) {
        closeRes.cost = (closeRes.cost ?? 0) + commissionForClose;
      }

      // Nadwyżka → otwieramy longa (prowizja otwarcia w locie)
      if (qtyToOpenLong > 0) {
        const openCommissionPerLotPLN =
          commissionForOpen !== 0 ? commissionForOpen / qtyToOpenLong : 0;
        openLong(lots, symbol, qtyToOpenLong, pricePerLotPLN, openCommissionPerLotPLN, actions);
      }

      closeRes.income = (closeRes.revenue ?? 0) - (closeRes.cost ?? 0);
      return closeRes;
    }

    // Brak shortów → czyste otwarcie longa (brak zdarzenia podatkowego)
    if (qty > 0) {
      const openCommissionPerLotPLN = commissionPLN !== 0 ? commissionPLN / qty : 0;
      openLong(lots, symbol, qty, pricePerLotPLN, openCommissionPerLotPLN, actions);
    }

    return EMPTY;
  }

  /**
   * SELL:
   *  - jeśli są longi → zamykamy je metodą FIFO,
   *                     prowizja częściowo idzie do kosztu zamknięcia,
   *                     reszta do nowych shortów (jako openCommissionPerLot).
   *  - jeśli brak longów → otwieramy shorta (prowizja w locie).
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

    // Są longi → zamykamy je najpierw
    if (totalLong > 0) {
      const qtyToClose = Math.min(totalLong, qty);
      const qtyToOpenShort = qty - qtyToClose;

      const commissionForClose = qtyToClose > 0 ? (commissionPLN * qtyToClose) / qty : 0;
      const commissionForOpen = commissionPLN - commissionForClose;

      // Zamykamy longi (bez prowizji zamknięcia – tę dodamy niżej)
      const closeRes = closeLongs(lots, symbol, qtyToClose, pricePerLotPLN, actions);

      // Prowizja ZAMKNIĘCIA longa → koszt podatkowy
      if (commissionForClose !== 0) {
        closeRes.cost = (closeRes.cost ?? 0) + commissionForClose;
      }

      // Nadwyżka → otwieramy shorta (prowizja otwarcia w locie)
      if (qtyToOpenShort > 0) {
        const openCommissionPerLotPLN =
          commissionForOpen !== 0 ? commissionForOpen / qtyToOpenShort : 0;
        openShort(lots, symbol, qtyToOpenShort, pricePerLotPLN, openCommissionPerLotPLN, actions);
      }

      closeRes.income = (closeRes.revenue ?? 0) - (closeRes.cost ?? 0);
      return closeRes;
    }

    // Brak longów → czyste otwarcie shorta (brak zdarzenia podatkowego)
    if (qty > 0) {
      const openCommissionPerLotPLN = commissionPLN !== 0 ? commissionPLN / qty : 0;
      openShort(lots, symbol, qty, pricePerLotPLN, openCommissionPerLotPLN, actions);
    }

    return EMPTY;
  }

  /** Pobiera lub tworzy tablicę lotów dla symbolu */
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
 * Zamyka shorty metodą FIFO.
 *
 * Dla każdego lota short:
 *  - lot.pricePerLotPLN          = premia BRUTTO na 1 sztukę
 *  - lot.openCommissionPerLotPLN = prowizja OTWARCIA na 1 sztukę
 *
 * Przy zamknięciu:
 *  - revenue += qty * lot.pricePerLotPLN
 *  - cost    += qty * closePricePLN
 *  - cost    += qty * lot.openCommissionPerLotPLN   (prowizja otwarcia)
 *  Prowizja ZAMKNIĘCIA dodawana jest wyżej w _processBuy.
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
    if (lot.qty >= 0) continue; // pomijamy longi

    const shortQty = Math.abs(lot.qty);
    const closeQty = Math.min(remaining, shortQty);
    if (closeQty <= 0) continue;

    const beforeQty = netPosition;

    // Przychód: pełna premia z otwarcia (BRUTTO)
    revenue += closeQty * lot.pricePerLotPLN;

    // Koszt: odkupienie po aktualnej cenie + prowizja OTWARCIA
    cost += closeQty * closePricePerLotPLN;
    cost += closeQty * lot.openCommissionPerLotPLN;

    // Aktualizacja lota i pozycji
    lot.qty += closeQty; // short zbliża się do zera
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

  // Usuwamy puste loty z początku
  while (lots.length > 0 && lots[0].qty === 0) {
    lots.shift();
  }

  return { revenue, cost, income: revenue - cost };
};

/**
 * Zamyka longi metodą FIFO.
 *
 * Dla każdego lota long:
 *  - lot.pricePerLotPLN          = cena zakupu (BRUTTO, bez prowizji)
 *  - lot.openCommissionPerLotPLN = prowizja OTWARCIA na 1 sztukę
 *
 * Przy zamknięciu:
 *  - revenue += qty * closePricePLN
 *  - cost    += qty * lot.pricePerLotPLN
 *  - cost    += qty * lot.openCommissionPerLotPLN   (prowizja otwarcia)
 *  Prowizja ZAMKNIĘCIA dodawana jest wyżej w _processSell.
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
    if (lot.qty <= 0) continue; // pomijamy shorty

    const closeQty = Math.min(remaining, lot.qty);
    if (closeQty <= 0) continue;

    const beforeQty = netPosition;

    // Przychód: sprzedaż longa po aktualnej cenie
    revenue += closeQty * closePricePerLotPLN;

    // Koszt: cena zakupu + prowizja OTWARCIA (proporcjonalnie)
    cost += closeQty * lot.pricePerLotPLN;
    cost += closeQty * lot.openCommissionPerLotPLN;

    // Aktualizacja lota i pozycji
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

  // Usuwamy puste loty z początku
  while (lots.length > 0 && lots[0].qty === 0) {
    lots.shift();
  }

  return { revenue, cost, income: revenue - cost };
};

/** Waliduje dane wejściowe transakcji */
const validateTrade = (trade: IBKRTradeDto, fxRatePLN: number): boolean => {
  if (!fxRatePLN || fxRatePLN <= 0) return false;
  if (!trade.symbol || !trade.quantity) return false;
  if (trade.tradePrice === null || trade.tradePrice === undefined) return false;
  return true;
};

/**
 * Otwiera nową pozycję short.
 *
 * - qty > 0 oznacza, że użytkownik sprzedał qty sztuk (short)
 * - pricePerLotPLN          = premia BRUTTO na 1 sztukę
 * - openCommissionPerLotPLN = prowizja OTWARCIA na 1 sztukę
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
 * Otwiera nową pozycję long.
 *
 * - qty > 0
 * - pricePerLotPLN          = cena zakupu BRUTTO (bez prowizji) na 1 szt.
 * - openCommissionPerLotPLN = prowizja OTWARCIA na 1 sztukę
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

/** Oblicza prowizję w PLN (zawsze dodatnią) */
const calculateCommissionPLN = (
  commissionFee: undefined | number | null,
  fxRatePLN: number
): number => {
  return Math.abs(commissionFee ?? 0) * fxRatePLN;
};

/** Oblicza cenę w PLN z uwzględnieniem mnożnika (np. 100 dla opcji) */
const calculatePricePLN = (tradePrice: number, fxRatePLN: number, multiplier: number): number => {
  return tradePrice * fxRatePLN * multiplier;
};

/** Oblicza całkowitą ilość shortów (wartość dodatnia) */
const calculateTotalShort = (lots: Lot[]): number => {
  return lots.filter(l => l.qty < 0).reduce((sum, lot) => sum + Math.abs(lot.qty), 0);
};

/** Oblicza całkowitą ilość longów */
const calculateTotalLong = (lots: Lot[]): number => {
  return lots.filter(l => l.qty > 0).reduce((sum, lot) => sum + lot.qty, 0);
};

/** Oblicza łączną (signed) pozycję dla symbolu */
const calculateNetPosition = (lots: Lot[]): number => {
  return lots.reduce((sum, lot) => sum + lot.qty, 0);
};
