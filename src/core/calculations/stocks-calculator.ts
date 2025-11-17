/**
 * Kalkulacje finansowe dla akcji
 *
 * Single Responsibility: Obliczanie revenue, cost, income dla transakcji akcjami
 *
 * === TERMINOLOGIA KSIĘGOWA ===
 *
 * PRZYCHÓD (revenue):
 * Pieniądze wpływające do inwestora (zawsze wartość dodatnia):
 * - Sprzedaż akcji (proceeds > 0)
 * - Zamknięcie pozycji z zyskiem
 *
 * KOSZT (cost):
 * Pieniądze wypływające od inwestora (zawsze wartość dodatnia):
 * - Zakup akcji (proceeds < 0)
 * - Prowizje (commissionFee)
 * - Zamknięcie pozycji ze stratą
 *
 * DOCHÓD (income):
 * Wynik podatkowy z inwestycji (może być dodatni lub ujemny):
 * - income = revenue - cost
 * - Dla zysku: income > 0 (revenue > cost)
 * - Dla straty: income < 0 (cost > revenue)
 *
 * === POLA Z IBKR ===
 *
 * realizedPL:
 * - Zrealizowany zysk/strata z zamknięcia pozycji
 * - Dodatnie dla zysku, ujemne dla straty
 * - Dla akcji: zawiera już WSZYSTKO (różnica cen + prowizje)
 */

import { IBKRTradeDto, TradeSummary } from '@models';

/**
 * Oblicza podsumowanie dla akcji (Pure Function)
 *
 * Akcje mają 2 scenariusze księgowe:
 *
 * 1. OPENING (O) - zakup akcji:
 *    - Nie rozpoznajemy jeszcze przychodu ani kosztu
 *    - Dopiero przy zamknięciu poznamy wynik
 *    → revenue = 0, cost = 0, income = 0
 *
 * 2. CLOSING (C) - sprzedaż akcji:
 *    - IBKR podaje realizedPL (zysk/strata) już uwzględniający wszystko
 *    - realizedPL > 0: zysk ze sprzedaży
 *      → revenue = realizedPL (przychód z różnicy cen)
 *      → cost = 0
 *    - realizedPL < 0: strata ze sprzedaży
 *      → revenue = 0
 *      → cost = -realizedPL (koszt to strata)
 */
export const calculateStocksSummary = (trade: IBKRTradeDto, nbpRate: number): TradeSummary => {
  const code = trade.code || '';

  // OPENING: zakup akcji - jeszcze bez wyniku
  if (code.includes('O')) {
    return { revenue: 0, cost: 0, income: 0 };
  }

  // CLOSING: sprzedaż akcji - realizujemy zysk/stratę
  if (code.includes('C') && trade.realizedPL !== undefined) {
    // Oblicz revenue, cost, income w walucie transakcji
    const revenueInCurrency = trade.realizedPL >= 0 ? trade.realizedPL : 0;
    const costInCurrency = trade.realizedPL < 0 ? -trade.realizedPL : 0;
    const incomeInCurrency = trade.realizedPL;

    return {
      revenue: revenueInCurrency * nbpRate,
      cost: costInCurrency * nbpRate,
      income: incomeInCurrency * nbpRate,
    };
  }

  return { revenue: undefined, cost: undefined, income: undefined };
};
