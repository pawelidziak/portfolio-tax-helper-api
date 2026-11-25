/**
 * Pure aggregation functions for tax calculation results
 *
 * Aggregates results from many transactions into a summary for the period.
 * Calculates the final tax, accounting for losses and withholding tax.
 *
 * All functions are pure (no I/O, HTTP, disk reads).
 */

import { PeriodTaxSummary, TaxSummary, Dividend, Interest, Borrow, Trade } from '@shared/models';

import { CAPITAL_GAINS_TAX_RATE } from './tax-rate';

/**
 * Aggregates tax calculation results and calculates the final tax
 *
 * Sums revenue, cost, income across all results (stocks, options, interest, borrows, dividends).
 * Calculates capital gains tax (19% in Poland).
 *
 * **Important:**
 * - A loss (negative income) is automatically deducted from gains
 * - Withholding tax (for dividends) is deducted from the Polish tax
 * - If totalIncome <= 0, tax = 0 (a loss is not taxed)
 *
 * @param trades - Array of trades (stocks, options, forex)
 * @param dividends - Array of dividends
 * @param interests - Array of interest entries
 * @param borrows - Array of stock borrow fees
 * @returns Period summary with the calculated tax
 */
export function aggregateResults(
  trades: Trade[] = [],
  dividends: Dividend[] = [],
  interests: Interest[] = [],
  borrows: Borrow[] = []
): PeriodTaxSummary {
  // Collect all TaxSummary entries from the different transaction types
  const allSummaries: TaxSummary[] = [
    ...dividends.map(dividend => dividend.summary),
    ...interests.map(interest => interest.summary),
    ...borrows.map(borrow => borrow.summary),
    ...trades.map(trade => trade.summary),
  ];

  // Sum the base values
  const totalRevenue = allSummaries.reduce((sum, result) => sum + (result.revenue ?? 0), 0);
  const totalCost = allSummaries.reduce((sum, result) => sum + (result.cost ?? 0), 0);
  const totalIncome = allSummaries.reduce((sum, result) => sum + (result.income ?? 0), 0);

  // Sum withholding tax (dividends only)
  // totalWithholdingTaxPLN = sum of all withholding taxes from dividends
  // Each withholdingTaxPLN is positive (see calculateDividend), so the sum is too (e.g. 880.21 PLN)
  const totalWithholdingTaxPLN = allSummaries.reduce(
    (sum, result) => sum + (result.withholdingTaxPLN ?? 0),
    0
  );

  // Deductible part of withholding tax (the 19% cap per dividend is already applied per dividend)
  const totalWithholdingTaxCreditPLN = allSummaries.reduce(
    (sum, result) => sum + (result.withholdingTaxCreditPLN ?? 0),
    0
  );

  // Capital gains tax in Poland: always a flat 19%
  const taxRate = CAPITAL_GAINS_TAX_RATE;

  // Calculate taxable income
  // A loss (negative income) is automatically deducted from gains
  // If totalIncome <= 0, taxableIncome = 0 (a loss is not taxed)
  const taxableIncome = Math.max(0, totalIncome);

  // Calculate tax before deducting withholding tax
  const taxAmountBeforeWithholding = taxableIncome * taxRate;

  // Deduct withholding tax (dividends only, up to a 19% cap of the dividend amount)
  const taxAmount = Math.max(0, taxAmountBeforeWithholding - totalWithholdingTaxCreditPLN);

  return {
    totalWithholdingTaxPLN,
    taxableIncome,
    totalRevenue,
    totalIncome,
    taxAmount,
    totalCost,
    taxRate,
  };
}
