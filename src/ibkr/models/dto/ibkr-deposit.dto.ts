/**
 * Model representing a deposit/withdrawal from the Deposits & Withdrawals section of the IBKR report
 *
 * This is PURE data from the CSV, with no enrichment.
 */

/**
 * A single deposit/withdrawal from the IBKR report (raw CSV data)
 * DTO = Data Transfer Object - data straight from CSV parsing
 */
export interface IBKRDepositDto {
  /** Deposit/withdrawal currency: USD, PLN, etc. */
  currency: string;

  /** Settle Date in YYYY-MM-DD format */
  settleDate: string;

  /** Transaction description (e.g. "Electronic Fund Transfer") */
  description: string;

  /**
   * Deposit/withdrawal amount
   * Positive values are deposits, negative ones are withdrawals.
   */
  amount: number;
}
