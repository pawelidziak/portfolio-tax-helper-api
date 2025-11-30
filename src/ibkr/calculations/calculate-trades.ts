import { TradeAction, TaxSummary } from '@shared/models';
import { IBKRTradeDto } from '@ibkr';

/**
 * ============================================
 *        UNIFIED TRADE TAX ENGINE
 * ============================================
 *
 * Zunifikowana logika obliczania podatków dla transakcji (stocks i options).
 * Używa metody FIFO do zarządzania pozycjami (lots).
 *
 * STRUKTURA:
 * - Lot: reprezentuje jedną pozycję (long lub short) z ceną w PLN
 * - FIFO: pierwsze otwarte pozycje są zamykane jako pierwsze
 * - Long: dodatnia qty (kupione akcje/kontrakty)
 * - Short: ujemna qty (sprzedane akcje/kontrakty bez posiadania)
 *
 * LOGIKA:
 * 1. BUY (quantity > 0):
 *    - Jeśli są shorty → zamyka shorty (realizuje zysk/stratę)
 *      - Jeśli kupujemy więcej niż shortów → nadwyżka otwiera longa
 *      - Prowizja dzielona proporcjonalnie:
 *        - część do zamknięcia shortów (od razu jako cost)
 *        - część do nowego longa (wliczona w costPerLot)
 *    - Jeśli nie ma shortów → otwiera longa (prowizja w costPerLot)
 *
 * 2. SELL (quantity < 0):
 *    - Jeśli są longi → zamyka longi (realizuje zysk/stratę)
 *      - Jeśli sprzedajemy więcej niż longów → nadwyżka otwiera short
 *      - Prowizja dzielona proporcjonalnie:
 *        - część do zamknięcia longa (cost)
 *        - część do nowego shorta (cost w tym samym trade)
 *    - Jeśli nie ma longów → otwiera short (prowizja jest kosztem trade'u)
 *
 * PROWIZJE:
 * - Wszystkie prowizje są kosztem (zgodnie z PIT)
 * - Cena rynkowa (tradePrice) jest zawsze „czysta” – bez prowizji
 * - Wyjątek: przy otwarciu LONG prowizja wchodzi w costPerLot (podstawa kosztowa)
 */

// ============================================
//            INTERFACES & TYPES
// ============================================

interface Lot {
  /** Ilość: dodatnia = long, ujemna = short */
  qty: number;
  /** Cena w PLN z dnia otwarcia pozycji (po kursie NBP z tego dnia) */
  pricePerLotPLN: number;
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
  ): { actions: TradeAction[]; tax: TaxSummary } {
    const EMPTY_TAX: TaxSummary = { revenue: 0, cost: 0, income: 0 };
    const actions: TradeAction[] = [];

    if (!validateTrade(trade, fxRatePLN)) {
      return { tax: EMPTY_TAX, actions };
    }

    const { symbol, quantity, tradePrice, commissionFee } = trade;
    const lots = this._getLots(symbol);

    const qty = Math.abs(quantity);
    const pricePLN = calculatePricePLN(tradePrice, fxRatePLN, this._config.multiplier);
    const commissionPLN = calculateCommissionPLN(commissionFee, fxRatePLN);

    let tax: TaxSummary = EMPTY_TAX;

    // BUY
    if (quantity > 0) {
      tax = this._processBuy(lots, symbol, qty, pricePLN, commissionPLN, actions);
    }

    // SELL
    if (quantity < 0) {
      tax = this._processSell(lots, symbol, qty, pricePLN, commissionPLN, actions);
    }

    return { tax, actions };
  }

  /**
   * Przetwarza transakcję BUY
   *
   * Scenariusze:
   * - są shorty:
   *    - zamykamy min(qty, totalShort)
   *    - jeśli qty > totalShort → nadwyżka otwiera longa
   *    - prowizja dzielona proporcjonalnie
   * - brak shortów:
   *    - otwieramy longa (prowizja w costPerLot)
   */
  private _processBuy(
    lots: Lot[],
    symbol: string,
    qty: number,
    pricePLN: number,
    commissionPLN: number,
    actions: TradeAction[]
  ): TaxSummary {
    const EMPTY: TaxSummary = { revenue: 0, cost: 0, income: 0 };
    const totalShort = calculateTotalShort(lots);

    // Jeśli są shorty, zamykamy je (częściowo lub w całości)
    if (totalShort > 0) {
      const qtyToClose = Math.min(totalShort, qty);
      const qtyToOpenLong = qty - qtyToClose;

      // Proporcjonalny podział prowizji
      const commissionForClose = qtyToClose > 0 ? (commissionPLN * qtyToClose) / qty : 0;
      const commissionForOpen = commissionPLN - commissionForClose;

      // Zamykamy shorty po czystej cenie rynkowej
      // Generuje akcje CLOSE_SHORT z beforeQty i afterQty
      const closeRes = closeShorts(lots, symbol, qtyToClose, pricePLN, actions);

      // Prowizja przypisana do zamykanego kawałka
      if (commissionForClose !== 0) {
        closeRes.cost = (closeRes.cost ?? 0) + commissionForClose;
      }

      // Jeśli nadwyżka → otwieramy longa
      // Ważne: afterQty z ostatniej akcji CLOSE_SHORT powinno być równe beforeQty z akcji OPEN_LONG
      // To pozwala wykryć częściowe zamknięcie i otwarcie w jednej transakcji
      if (qtyToOpenLong > 0) {
        const costPerLotPLN =
          pricePLN + (commissionForOpen !== 0 ? commissionForOpen / qtyToOpenLong : 0);
        openLong(lots, symbol, qtyToOpenLong, costPerLotPLN, actions);
      }

      closeRes.income = (closeRes.revenue ?? 0) - (closeRes.cost ?? 0);
      return closeRes;
    }

    // Brak shortów → otwieramy longa
    const costPerLotPLN = pricePLN + (commissionPLN !== 0 && qty > 0 ? commissionPLN / qty : 0);
    openLong(lots, symbol, qty, costPerLotPLN, actions);

    return EMPTY;
  }

  /**
   * Przetwarza transakcję SELL
   *
   * Scenariusze:
   * - są longi:
   *    - zamykamy min(qty, totalLong)
   *    - jeśli qty > totalLong → nadwyżka otwiera short
   *    - prowizja dzielona proporcjonalnie
   * - brak longów:
   *    - otwieramy short (prowizja jako koszt trade'u)
   */
  private _processSell(
    lots: Lot[],
    symbol: string,
    qty: number,
    pricePLN: number,
    commissionPLN: number,
    actions: TradeAction[]
  ): TaxSummary {
    const totalLong = calculateTotalLong(lots);

    if (totalLong > 0) {
      const qtyToClose = Math.min(totalLong, qty);
      const qtyToOpenShort = qty - qtyToClose;

      // Proporcjonalny podział prowizji
      const commissionForClose = qtyToClose > 0 ? (commissionPLN * qtyToClose) / qty : 0;
      const commissionForOpen = commissionPLN - commissionForClose;

      // Zamykamy longi po cenie rynkowej
      // Generuje akcje CLOSE_LONG z beforeQty i afterQty
      const closeRes = closeLongs(lots, symbol, qtyToClose, pricePLN, actions);

      // Prowizja za zamknięcie longa
      if (commissionForClose !== 0) {
        closeRes.cost = (closeRes.cost ?? 0) + commissionForClose;
      }

      // Jeśli nadwyżka → otwieramy short
      // Ważne: afterQty z ostatniej akcji CLOSE_LONG powinno być równe beforeQty z akcji OPEN_SHORT
      // To pozwala wykryć częściowe zamknięcie i otwarcie w jednej transakcji
      if (qtyToOpenShort > 0) {
        openShort(lots, symbol, qtyToOpenShort, pricePLN, actions);

        // Prowizja za otwarcie shorta też jest kosztem tego trade'u
        if (commissionForOpen !== 0) {
          closeRes.cost = (closeRes.cost ?? 0) + commissionForOpen;
        }
      }

      closeRes.income = (closeRes.revenue ?? 0) - (closeRes.cost ?? 0);
      return closeRes;
    }

    // Brak longów → otwieramy short
    openShort(lots, symbol, qty, pricePLN, actions);
    // Prowizja jest kosztem (short nie generuje przychodu przy otwarciu)
    return { revenue: 0, cost: commissionPLN, income: -commissionPLN };
  }

  /**
   * Pobiera lub tworzy tablicę lotów dla symbolu
   */
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
 * Zamyka shorty metodą FIFO
 *
 * WAŻNE: Każdy lot jest zamykany osobno, nawet jeśli zamykamy wszystko w jednej transakcji.
 * Powód: Każdy lot ma inną cenę bazową (lotPricePerLotPLN), która zależy od ceny zakupu
 * i kursu NBP z dnia otwarcia pozycji. Dla celów podatkowych musimy wiedzieć, które
 * akcje/kontrakty zostały zamknięte i po jakiej cenie bazowej, aby poprawnie obliczyć
 * koszt i dochód dla każdego lotu osobno.
 *
 * Przykład: Jeśli mamy 2 loty (300 szt. po 2230.77 PLN i 200 szt. po 2232.35 PLN)
 * i sprzedajemy 500 szt. w jednej transakcji, otrzymamy 2 akcje CLOSE_SHORT:
 * - jedna dla 300 szt. z ceną bazową 2230.77 PLN
 * - druga dla 200 szt. z ceną bazową 2232.35 PLN
 *
 * @param lots - tablica lotów (modyfikowana)
 * @param qtyToClose - ilość do zamknięcia (<= całkowita ilość shortów)
 * @param closePricePLN - cena zamknięcia w PLN (czysta, bez prowizji)
 * @returns Przychód, koszt, dochód
 */
const closeShorts = (
  lots: Lot[],
  symbol: string,
  qtyToClose: number,
  closePricePLN: number,
  actions: TradeAction[]
): CloseResult => {
  let remaining = qtyToClose;
  let revenue = 0;
  let cost = 0;

  // Łączna pozycja przed pierwszym zamknięciem
  let netPosition = calculateNetPosition(lots);

  for (let i = 0; i < lots.length && remaining > 0; i++) {
    const lot = lots[i];
    if (lot.qty >= 0) continue; // pomijamy longi

    const shortQty = Math.abs(lot.qty);
    const closeQty = Math.min(remaining, shortQty);

    if (closeQty <= 0) continue;

    const beforeQty = netPosition;

    // Przychód: premia z otwarcia shorta (realizowana przy zamknięciu)
    revenue += closeQty * lot.pricePerLotPLN;
    // Koszt: odkupienie shorta po cenie rynkowej
    cost += closeQty * closePricePLN;

    // Aktualizacja lota i pozycji
    lot.qty += closeQty; // short zbliża się do zera
    netPosition += closeQty; // pozycja (ujemna) rośnie w stronę zera

    const afterQty = netPosition;

    // Tworzymy osobną akcję dla każdego lotu (każdy ma inną cenę bazową)
    actions.push({
      type: 'CLOSE_SHORT',
      symbol,
      qty: closeQty,
      tradePricePerLotPLN: closePricePLN,
      lotPricePerLotPLN: lot.pricePerLotPLN,
      beforeQty,
      afterQty,
    });

    remaining -= closeQty;
  }

  // Usuwamy puste loty z początku tablicy
  while (lots.length > 0 && lots[0].qty === 0) {
    lots.shift();
  }

  return { revenue, cost, income: revenue - cost };
};

/**
 * Zamyka longi metodą FIFO
 *
 * WAŻNE: Każdy lot jest zamykany osobno, nawet jeśli zamykamy wszystko w jednej transakcji.
 * Powód: Każdy lot ma inną cenę bazową (lotPricePerLotPLN), która zależy od ceny zakupu
 * i kursu NBP z dnia otwarcia pozycji. Dla celów podatkowych musimy wiedzieć, które
 * akcje/kontrakty zostały zamknięte i po jakiej cenie bazowej, aby poprawnie obliczyć
 * koszt i dochód dla każdego lotu osobno.
 *
 * Przykład: Jeśli mamy 2 loty (300 szt. po 2230.77 PLN i 200 szt. po 2232.35 PLN)
 * i sprzedajemy 500 szt. w jednej transakcji, otrzymamy 2 akcje CLOSE_LONG:
 * - jedna dla 300 szt. z ceną bazową 2230.77 PLN
 * - druga dla 200 szt. z ceną bazową 2232.35 PLN
 *
 * @param lots - tablica lotów (modyfikowana)
 * @param qtyToClose - ilość do zamknięcia (<= całkowita ilość longów)
 * @param closePricePLN - cena zamknięcia w PLN (czysta, bez prowizji)
 * @returns Przychód, koszt, dochód
 */
const closeLongs = (
  lots: Lot[],
  symbol: string,
  qtyToClose: number,
  closePricePLN: number,
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

    // Przychód: sprzedaż longa
    revenue += closeQty * closePricePLN;
    // Koszt: cena z otwarcia longa
    cost += closeQty * lot.pricePerLotPLN;

    // Aktualizacja lota i pozycji
    lot.qty -= closeQty;
    netPosition -= closeQty;

    const afterQty = netPosition;

    // Tworzymy osobną akcję dla każdego lotu (każdy ma inną cenę bazową)
    actions.push({
      type: 'CLOSE_LONG',
      symbol,
      qty: closeQty,
      tradePricePerLotPLN: closePricePLN,
      lotPricePerLotPLN: lot.pricePerLotPLN,
      beforeQty,
      afterQty,
    });

    remaining -= closeQty;
  }

  // Usuwamy puste loty z początku tablicy
  while (lots.length > 0 && lots[0].qty === 0) {
    lots.shift();
  }

  return { revenue, cost, income: revenue - cost };
};

/**
 * Waliduje dane wejściowe transakcji
 */
const validateTrade = (trade: IBKRTradeDto, fxRatePLN: number): boolean => {
  if (!fxRatePLN || fxRatePLN <= 0) return false;
  if (!trade.symbol || !trade.quantity) return false;
  if (trade.tradePrice === null || trade.tradePrice === undefined) return false;
  return true;
};

/**
 * Otwiera nową pozycję short
 */
const openShort = (
  lots: Lot[],
  symbol: string,
  qty: number,
  revenuePerLotPLN: number,
  actions: TradeAction[]
): void => {
  if (qty <= 0) return;

  const beforeQty = calculateNetPosition(lots);

  lots.push({ qty: -qty, pricePerLotPLN: revenuePerLotPLN });

  const afterQty = beforeQty - qty;

  actions.push({
    type: 'OPEN_SHORT',
    symbol,
    qty,
    tradePricePerLotPLN: revenuePerLotPLN,
    beforeQty,
    afterQty,
  });
};

/**
 * Oblicza prowizję w PLN
 */
const calculateCommissionPLN = (
  commissionFee: undefined | number | null,
  fxRatePLN: number
): number => {
  return Math.abs(commissionFee ?? 0) * fxRatePLN;
};

/**
 * Otwiera nową pozycję long
 */
const openLong = (
  lots: Lot[],
  symbol: string,
  qty: number,
  costPerLotPLN: number,
  actions: TradeAction[]
): void => {
  if (qty <= 0) return;

  const beforeQty = calculateNetPosition(lots);

  lots.push({ qty, pricePerLotPLN: costPerLotPLN });

  const afterQty = beforeQty + qty;

  actions.push({
    type: 'OPEN_LONG',
    symbol,
    qty,
    tradePricePerLotPLN: costPerLotPLN,
    beforeQty,
    afterQty,
  });
};

/**
 * Oblicza cenę w PLN z uwzględnieniem mnożnika
 */
const calculatePricePLN = (tradePrice: number, fxRatePLN: number, multiplier: number): number => {
  return tradePrice * fxRatePLN * multiplier;
};

/**
 * Oblicza całkowitą ilość shortów dla symbolu
 */
const calculateTotalShort = (lots: Lot[]): number => {
  return lots.filter(l => l.qty < 0).reduce((sum, lot) => sum + Math.abs(lot.qty), 0);
};

/**
 * Oblicza całkowitą ilość longów dla symbolu
 */
const calculateTotalLong = (lots: Lot[]): number => {
  return lots.filter(l => l.qty > 0).reduce((sum, lot) => sum + lot.qty, 0);
};

/**
 * Oblicza łączną (signed) pozycję dla symbolu
 */
const calculateNetPosition = (lots: Lot[]): number => {
  return lots.reduce((sum, lot) => sum + lot.qty, 0);
};
