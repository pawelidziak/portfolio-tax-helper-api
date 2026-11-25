/**
 * Tax summary for a period
 *
 * Aggregation of tax results from multiple transactions in a given period
 * (can be a month, quarter, year, or any other period).
 * Contains totals of revenue, cost, income and the calculated final tax.
 */
export interface PeriodTaxSummary {
  /** Total revenue in PLN */
  totalRevenue: number;
  /** Total cost in PLN */
  totalCost: number;
  /** Total income in PLN (can be negative - a loss) */
  totalIncome: number;
  /** Total withholding tax in PLN (dividends only) */
  totalWithholdingTaxPLN: number;
  /** Tax rate (always 19% for capital gains in Poland) */
  taxRate: number;
  /** Tax to pay in PLN (after deducting losses and withholding tax) */
  taxAmount: number;
  /** Taxable income (max(0, totalIncome)) */
  taxableIncome: number;
}
