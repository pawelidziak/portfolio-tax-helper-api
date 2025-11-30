import { TaxSummary } from '@shared/models';
import { IBKRInterestDto } from '@ibkr';

export function calculateInterestResult(
  interest: IBKRInterestDto,
  fxRateToPLN: number
): TaxSummary {
  const amount = interest.amount ?? 0;

  if (amount > 0) {
    // dodatnie odsetki (cash credit interest)
    const revenue = amount * fxRateToPLN;
    const cost = 0;
    const income = revenue;

    return { revenue, cost, income };
  }

  if (amount < 0) {
    // ujemne odsetki (margin / debit interest)
    const revenue = 0;
    const cost = Math.abs(amount) * fxRateToPLN;
    const income = revenue - cost; // ujemny

    return { revenue, cost, income };
  }

  // amount === 0
  return { revenue: 0, cost: 0, income: 0 };
}
