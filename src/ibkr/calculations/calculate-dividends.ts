import { TaxSummary } from '@shared/models';

import { IBKRDividendDto } from '../models/dto';

export function calculateDividendResult(
  dividend: IBKRDividendDto,
  fxRateToPLN: number
): TaxSummary {
  const gross = dividend.grossAmount ?? 0; // USD
  const wht = dividend.withholdingTaxAmount ?? 0; // zwykle ujemny w IBKR

  const revenue = gross * fxRateToPLN; // przychód brutto
  const withholdingTaxPLN = Math.abs(wht) * fxRateToPLN; // potrącony podatek jako dodatnia wartość
  const cost = 0;
  const income = revenue; // brak kosztów

  return { revenue, cost, income, withholdingTaxPLN };
}
