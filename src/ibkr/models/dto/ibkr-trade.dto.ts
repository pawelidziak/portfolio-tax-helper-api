/**
 * Model representing a trade from the Trades section of the IBKR report
 *
 * Documentation: https://www.ibkrguides.com/reportingreference/reportguide/trades_default.htm
 *
 * This is PURE data from the CSV, with no enrichment.
 */

/**
 * A single trade from the IBKR report (raw CSV data)
 * DTO = Data Transfer Object - data straight from CSV parsing
 */
export interface IBKRTradeDto {
  /** Record type: Order (trade), SubTotal (subtotal), Total (total) */
  dataDiscriminator: string;

  /** Asset category (raw IBKR value: "Stocks", "Equity and Index Options", "Forex") */
  assetCategory: string;

  /** Transaction currency: USD, PLN, etc. */
  currency: string;

  /** Symbol of the instrument that was traded */
  symbol: string;

  /** Trade execution date and time (Format: "YYYY-MM-DD, HH:MM:SS") */
  dateTime: string;

  /**
   * Number of units in the trade.
   * Negative values mean a sell, positive ones a buy.
   */
  quantity: number;

  /**
   * T. Price - Transaction price
   * Price at which the trade was executed.
   */
  tradePrice: number;

  /**
   * C. Price - Closing price
   * Instrument closing price on the trade date.
   */
  closingPrice: number;

  /**
   * Proceeds - Trade proceeds
   * Calculated as quantity * trade price.
   * Negative for buys, positive for sells.
   */
  proceeds: number;

  /**
   * Comm/Fee - Commission and fees
   * Total amount of commission and fees for the trade.
   * For cost basis and realized profit/loss purposes, commissions are netted.
   */
  commissionFee: number;

  /**
   * Basis - Cost basis
   * For an opening trade: the negation of proceeds + commission + tax amount.
   * For a closing trade: the cost basis from the opening trade.
   */
  basis: number;

  /**
   * Realized P/L - Realized profit/loss
   * Calculated as: proceeds of the closing trade + commissions + basis.
   *
   * Note: When an option position is assigned or exercised, the realized P/L
   * is not calculated for the option position itself. Instead, the premium received/paid
   * on the original sale/purchase of the option is included in the realized P/L
   * when the stock position resulting from the option assignment/exercise is closed.
   */
  realizedPL: number;

  /**
   * MTM P/L - Mark-to-Market profit/loss
   * Difference between the trade price and the closing price, multiplied by quantity.
   * For MTM P/L, commissions are not netted and are included as a separate line
   * in the MTM performance summary above.
   */
  mtmPL: number;

  /**
   * Code - Trade code abbreviation
   * Codes describing the trade type (e.g. "A;O" - Assignment/Opening,
   * "C" - Closing, "C;P" - Closing/Partial, "O" - Opening, "C;Ep" - Closing/Expired)
   * The full list of codes is in the Codes section of the report.
   */
  code?: string;
}
