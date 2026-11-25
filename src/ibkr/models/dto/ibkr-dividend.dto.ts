/**
 * Model representing dividends from the Interest and Withholding Tax sections of the IBKR report
 *
 * This is PURE data from the CSV, with no enrichment.
 */

/**
 * A single dividend from the IBKR report
 * DTO = Data Transfer Object - data straight from CSV parsing
 *
 * Dividends can appear in the "Interest" section (gross amount) and the "Withholding Tax" section (withholding tax).
 * These two entries must be merged into a single dividend record.
 */
export interface IBKRDividendDto {
  /** Dividend currency: USD, PLN, etc. */
  currency: string;

  /** Dividend date (Format: "YYYY-MM-DD") */
  date: string;

  /** Instrument symbol (ticker) */
  symbol: string;

  /**
   * Gross dividend amount (before withholding tax)
   * From the "Interest" section - always positive
   */
  grossAmount: number;

  /**
   * Withholding tax
   * From the "Withholding Tax" section - always negative (because it is a cost)
   * Can be 0 if there is no tax
   */
  withholdingTaxAmount: number;

  /**
   * Net dividend amount (after withholding tax)
   * Calculated as: grossAmount + withholdingTaxAmount
   * (withholdingTaxAmount is negative, so this is a subtraction)
   */
  netAmount: number;
}
