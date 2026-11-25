/**
 * Model representing interest from the Interest section of the IBKR report
 *
 * This is PURE data from the CSV, with no enrichment.
 */

/**
 * A single interest entry from the IBKR report
 * DTO = Data Transfer Object - data straight from CSV parsing
 */
export interface IBKRInterestDto {
  /** Interest currency: USD, PLN, etc. */
  currency: string;

  /** Interest date (Format: "YYYY-MM-DD") */
  date: string;

  /** Interest description (e.g. "USD Credit Interest for Oct-2025", "USD Debit Interest") */
  description: string;

  /**
   * Interest amount
   * Positive for credit interest (IBKR pays)
   * Negative for debit interest (IBKR charges - margin interest)
   */
  amount: number;
}
