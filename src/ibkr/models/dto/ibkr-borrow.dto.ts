/**
 * Model representing stock borrow fees (Borrow Fee) from the Borrow Fee Details section of the IBKR report
 *
 * This is PURE data from the CSV, with no enrichment.
 */

/**
 * A single stock borrow fee from the IBKR report
 * DTO = Data Transfer Object - data straight from CSV parsing
 */
export interface IBKRBorrowDto {
  /** Fee currency: USD, PLN, etc. */
  currency: string;

  /** Value Date - Format: "YYYY-MM-DD" */
  valueDate: string;

  /** Instrument symbol (e.g. "QQQ") */
  symbol: string;

  /** Quantity of borrowed shares */
  quantity: number;

  /** Share price */
  price: number;

  /** Collateral value */
  value: number;

  /** Fee rate in % per year */
  feeRate: number;

  /**
   * Borrow Fee
   * Always negative (a cost to the borrower)
   */
  borrowFee: number;

  /** Transaction code (e.g. "Po") */
  code: string;
}
