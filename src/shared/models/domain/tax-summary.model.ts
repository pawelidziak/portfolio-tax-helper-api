/**
 * Tax summary of a transaction
 *
 * Contains calculated values: revenue, cost, income and tax information
 * The exchange rate is in a separate field, Record.exchangeRate
 */
export interface TaxSummary {
  /**
   * Revenue - Trade revenue in PLN
   * Added by the mapper.
   * Money that flows to you as a result of the trade
   * (selling shares, option premium, opening a short).
   * Calculated as: proceeds × nbpRate (when proceeds > 0)
   */
  revenue?: number;

  /**
   * Cost - Trade cost in PLN
   * Added by the mapper.
   * Money that flows out from you so that this revenue can arise at all
   * (buying shares, buying back a short, premium paid, commissions).
   * Calculated as: -proceeds × nbpRate (when proceeds < 0) + commissionFee × nbpRate
   */
  cost?: number;

  /**
   * Income - Trade income in PLN
   * Added by the mapper.
   * Your tax result from the investment (can be positive - a profit, or negative - a loss).
   * Calculated as: revenue - cost
   *
   * Note: A loss (negative income) can be deducted from capital gains.
   * Tax is calculated only after aggregating all trades.
   */
  income?: number;

  /**
   * Withholding Tax PLN - Withholding tax paid abroad (in PLN, positive value)
   * Only for dividends subject to withholding tax (e.g. US 15%)
   */
  withholdingTaxPLN?: number;

  /**
   * Withholding Tax Credit PLN - Portion of the withholding tax that may be deducted from Polish tax
   * Calculated as: min(withholdingTaxPLN, 19% × revenue), in line with the double taxation
   * treaty and the limit under the PIT act
   */
  withholdingTaxCreditPLN?: number;
}
