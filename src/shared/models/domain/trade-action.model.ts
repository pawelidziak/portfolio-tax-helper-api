/**
 * Akcja na pozycji w ramach transakcji
 */
export interface TradeAction {
  type: TradeActionType;
  symbol: string;
  /** Ilość w ramach tej jednej akcji (może być część całego trade'u) */
  qty: number;
  /** Cena transakcyjna per 1 szt. w PLN (dla open: costPerLot / revenuePerLot, dla close: closePricePLN) */
  tradePricePerLotPLN: number;
  /** Dla CLOSE_*: cena z otwarcia danego lota (cost basis / premia) */
  lotPricePerLotPLN?: number;
  /** Łączna pozycja (signed) przed akcją dla tego symbolu */
  beforeQty: number;
  /** Łączna pozycja (signed) po tej akcji dla tego symbolu */
  afterQty: number;
}

/**
 * Typ akcji transakcji
 */
export type TradeActionType = 'CLOSE_SHORT' | 'CLOSE_LONG' | 'OPEN_SHORT' | 'OPEN_LONG';
