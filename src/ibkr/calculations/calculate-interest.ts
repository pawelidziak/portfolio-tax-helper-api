import { TaxSummary } from '@shared/models';
import { roundToDecimals } from '@utils';
import { IBKRInterestDto } from '@ibkr';

export function calculateInterestResult(
  interest: IBKRInterestDto,
  fxRateToPLN: number
): TaxSummary {
  const amount = interest.amount ?? 0;

  if (amount > 0) {
    // positive interest (cash credit interest)
    // Round to 2 decimal places (per tax practice)
    const revenue = roundToDecimals(amount * fxRateToPLN);
    const cost = 0;
    const income = revenue;

    return { revenue, cost, income };
  }

  if (amount < 0) {
    // negative interest (margin / debit interest)
    // Round to 2 decimal places (per tax practice)
    const revenue = 0;
    const cost = roundToDecimals(Math.abs(amount) * fxRateToPLN);
    const income = roundToDecimals(revenue - cost); // negative

    return { revenue, cost, income };
  }

  // amount === 0
  return { revenue: 0, cost: 0, income: 0 };
}
