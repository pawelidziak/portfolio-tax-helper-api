import { TaxSummary } from '@shared/models';
import { roundToDecimals } from '@utils';
import { IBKRInterestDto } from '@ibkr';

export function calculateInterestResult(
  interest: IBKRInterestDto,
  fxRateToPLN: number
): TaxSummary {
  const amount = interest.amount ?? 0;

  if (amount > 0) {
    // dodatnie odsetki (cash credit interest)
    // Zaokrąglamy do 2 miejsc po przecinku (zgodnie z praktyką podatkową)
    const revenue = roundToDecimals(amount * fxRateToPLN);
    const cost = 0;
    const income = revenue;

    return { revenue, cost, income };
  }

  if (amount < 0) {
    // ujemne odsetki (margin / debit interest)
    // Zaokrąglamy do 2 miejsc po przecinku (zgodnie z praktyką podatkową)
    const revenue = 0;
    const cost = roundToDecimals(Math.abs(amount) * fxRateToPLN);
    const income = roundToDecimals(revenue - cost); // ujemny

    return { revenue, cost, income };
  }

  // amount === 0
  return { revenue: 0, cost: 0, income: 0 };
}
