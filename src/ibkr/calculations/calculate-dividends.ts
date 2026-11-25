import { TaxSummary } from '@shared/models';
import { roundToDecimals } from '@utils';

import { CAPITAL_GAINS_TAX_RATE } from './tax-rate';
import { IBKRDividendDto } from '../models/dto';

export function calculateDividendResult(
  dividend: IBKRDividendDto,
  fxRateToPLN: number
): TaxSummary {
  const gross = dividend.grossAmount ?? 0; // USD
  const wht = dividend.withholdingTaxAmount ?? 0; // usually negative in IBKR

  // Round to 2 decimal places (per tax practice)
  const revenue = roundToDecimals(gross * fxRateToPLN); // gross revenue
  const withholdingTaxPLN = roundToDecimals(Math.abs(wht) * fxRateToPLN); // withheld tax as a positive value
  // The credit cannot exceed the Polish tax on this dividend (Art. 30a(9) of the PIT Act)
  const withholdingTaxCreditPLN = roundToDecimals(
    Math.min(withholdingTaxPLN, revenue * CAPITAL_GAINS_TAX_RATE)
  );
  const cost = 0;
  const income = revenue; // no costs

  return { revenue, cost, income, withholdingTaxPLN, withholdingTaxCreditPLN };
}
