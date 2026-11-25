/**
 * Action on a position within a trade
 */
export interface TradeAction {
  type: TradeActionType;
  symbol: string;
  /** Quantity within this single action (may be part of the whole trade) */
  qty: number;
  /** Trade price per 1 unit in PLN (for open: costPerLot / revenuePerLot, for close: closePricePLN) */
  tradePricePerLotPLN: number;
  /** For CLOSE_*: price at which the given lot was opened (cost basis / premium) */
  lotPricePerLotPLN?: number;
  /** Total position (signed) before the action for this symbol */
  beforeQty: number;
  /** Total position (signed) after this action for this symbol */
  afterQty: number;
}

/**
 * Trade action type
 */
export type TradeActionType = 'CLOSE_SHORT' | 'CLOSE_LONG' | 'OPEN_SHORT' | 'OPEN_LONG';
