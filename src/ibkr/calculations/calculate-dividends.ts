import { TaxSummary } from '@shared/models';
import { roundToDecimals } from '@utils';

import { IBKRDividendDto } from '../models/dto';

export function calculateDividendResult(
  dividend: IBKRDividendDto,
  fxRateToPLN: number
): TaxSummary {
  const gross = dividend.grossAmount ?? 0; // USD
  const wht = dividend.withholdingTaxAmount ?? 0; // zwykle ujemny w IBKR

  // Zaokrąglamy do 2 miejsc po przecinku (zgodnie z praktyką podatkową)
  const revenue = roundToDecimals(gross * fxRateToPLN); // przychód brutto
  const withholdingTaxPLN = roundToDecimals(Math.abs(wht) * fxRateToPLN); // potrącony podatek jako dodatnia wartość
  const cost = 0;
  const income = revenue; // brak kosztów

  return { revenue, cost, income, withholdingTaxPLN };
}
