/**
 * Czyste funkcje agregacyjne dla wyników kalkulacji podatkowych
 *
 * Agreguje wyniki z wielu transakcji w podsumowanie roczne.
 * Brak nowej logiki domenowej - tylko sumowanie.
 *
 * Wszystkie funkcje są pure (brak I/O, HTTP, disk reads).
 */

import { TaxSummary } from '@shared/models';

/**
 * Podsumowanie roczne wyników podatkowych
 */
export interface YearlySummary {
  totalRevenue: number; // PLN
  totalCost: number; // PLN
  totalProfit: number; // PLN
}

/**
 * Agreguje wyniki kalkulacji podatkowych
 *
 * Sumuje revenue, cost, profit ze wszystkich wyników.
 * totalProfit = totalRevenue - totalCost (powinno się zgadzać z sumą profit)
 */
export function aggregateResults(results: TaxSummary[]): YearlySummary {
  const totalRevenue = results.reduce((sum, result) => sum + (result.revenue ?? 0), 0);
  const totalCost = results.reduce((sum, result) => sum + (result.cost ?? 0), 0);
  const totalProfit = results.reduce((sum, result) => sum + (result.income ?? 0), 0);

  return {
    totalRevenue,
    totalCost,
    totalProfit,
  };
}
