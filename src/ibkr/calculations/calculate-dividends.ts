/**
 * Czyste funkcje kalkulacyjne dla dywidend
 *
 * Implementuje logikę podatkową dla dywidend z akcji/ETF
 * z możliwym zagranicznym podatkiem u źródła (np. 15% US).
 *
 * Wszystkie wartości zwracane są w PLN.
 * Wszystkie funkcje są pure (brak I/O, HTTP, disk reads).
 *
 * === STRUKTURA DANYCH ===
 * Dywidendy mogą być w sekcji "Interest" lub "Withholding Tax" w raporcie IBKR.
 * Dla uproszczenia przyjmujemy model z polami:
 * - grossAmount: dywidenda przed podatkiem zagranicznym
 * - withholdingTaxAmount: podatek zagraniczny (np. US 15%)
 */

import { TaxSummary } from '@shared/models';

/**
 * Typ pomocniczy dla dywidendy
 * W rzeczywistości dane mogą pochodzić z różnych sekcji IBKR
 */
export interface DividendLike {
  ticker: string;
  grossAmount: number; // dywidenda przed podatkiem zagranicznym, w walucie oryginalnej
  withholdingTaxAmount: number; // podatek zagraniczny (np. US 15%), w walucie oryginalnej (ujemny)
  currency: string;
  fxRateToPLN: number;
}

/**
 * Typ wyniku kalkulacji dywidendy
 * Rozszerza TaxSummary o informację o podatku u źródła
 */
export type DividendCalcResult = {
  withholdingTaxPLN: number;
} & TaxSummary;

/**
 * Oblicza wynik podatkowy dla dywidendy
 *
 * Revenue: grossAmount w PLN
 * Cost: 0 (brak kosztów w tym uproszczonym modelu)
 * Income: revenue (bo cost = 0)
 * WithholdingTaxPLN: withholdingTaxAmount w PLN (zawsze ujemny lub 0)
 *
 * Uwaga: Nie obliczamy tutaj finalnego polskiego podatku (np. 19% - podatek zagraniczny).
 * To jest obsługiwane w wyższych warstwach.
 */
export function calculateDividendResult(dividend: DividendLike): DividendCalcResult {
  const revenue = dividend.grossAmount * dividend.fxRateToPLN;
  const withholdingTaxPLN = Math.abs(dividend.withholdingTaxAmount) * dividend.fxRateToPLN; // withholdingTaxAmount jest ujemny, więc używamy abs
  const cost = 0;
  const income = revenue; // bo cost = 0

  return {
    revenue,
    cost,
    income,
    withholdingTaxPLN,
  };
}
