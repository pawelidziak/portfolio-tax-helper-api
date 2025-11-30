/**
 * Czyste funkcje agregacyjne dla wyników kalkulacji podatkowych
 *
 * Agreguje wyniki z wielu transakcji w podsumowanie dla okresu.
 * Oblicza finalny podatek z uwzględnieniem strat i podatku u źródła.
 *
 * Wszystkie funkcje są pure (brak I/O, HTTP, disk reads).
 */

import { PeriodTaxSummary, TaxSummary, Dividend, Interest, Borrow, Trade } from '@shared/models';

/**
 * Agreguje wyniki kalkulacji podatkowych i oblicza finalny podatek
 *
 * Sumuje revenue, cost, income ze wszystkich wyników (akcje, opcje, odsetki, pożyczki, dywidendy).
 * Oblicza podatek od zysków kapitałowych (19% w Polsce).
 *
 * **Ważne:**
 * - Strata (ujemny income) jest automatycznie odliczana od zysków
 * - Podatek u źródła (dla dywidend) jest odliczany od polskiego podatku
 * - Jeśli totalIncome <= 0, to podatek = 0 (strata nie jest opodatkowana)
 *
 * @param trades - Tablica transakcji (akcje, opcje, forex)
 * @param dividends - Tablica dywidend
 * @param interests - Tablica odsetek
 * @param borrows - Tablica opłat za pożyczkę akcji
 * @returns Podsumowanie okresu z obliczonym podatkiem
 */
export function aggregateResults(
  trades: Trade[] = [],
  dividends: Dividend[] = [],
  interests: Interest[] = [],
  borrows: Borrow[] = []
): PeriodTaxSummary {
  // Zbierz wszystkie TaxSummary z różnych typów transakcji
  const allSummaries: TaxSummary[] = [
    ...dividends.map(dividend => dividend.summary),
    ...interests.map(interest => interest.summary),
    ...borrows.map(borrow => borrow.summary),
    ...trades.map(trade => trade.summary),
  ];

  // Sumuj podstawowe wartości
  const totalRevenue = allSummaries.reduce((sum, result) => sum + (result.revenue ?? 0), 0);
  const totalCost = allSummaries.reduce((sum, result) => sum + (result.cost ?? 0), 0);
  const totalIncome = allSummaries.reduce((sum, result) => sum + (result.income ?? 0), 0);

  // Sumuj podatek u źródła (tylko dla dywidend)
  // totalWithholdingTaxPLN = suma wszystkich podatków u źródła z dywidend
  // Każdy withholdingTaxPLN jest ujemny (spójność z IBKR, gdzie withholdingTaxAmount jest ujemny)
  // Więc totalWithholdingTaxPLN będzie ujemny (np. -880.21 PLN)
  const totalWithholdingTaxPLN = allSummaries.reduce(
    (sum, result) => sum + (result.withholdingTaxPLN ?? 0),
    0
  );

  // Podatek od zysków kapitałowych w Polsce: zawsze 19% liniowo
  const taxRate = 0.19;

  // Oblicz dochód podlegający opodatkowaniu
  // Strata (ujemny income) jest automatycznie odliczana od zysków
  // Jeśli totalIncome <= 0, to taxableIncome = 0 (strata nie jest opodatkowana)
  const taxableIncome = Math.max(0, totalIncome);

  // Oblicz podatek przed odliczeniem podatku u źródła
  const taxAmountBeforeWithholding = taxableIncome * taxRate;

  // Odlicz podatek u źródła (tylko dla dywidend)
  // totalWithholdingTaxPLN jest ujemny, więc dodajemy go (co jest równoważne odjęciu dodatniej wartości)
  // Zgodnie z umową o unikaniu podwójnego opodatkowania
  const taxAmount = Math.max(0, taxAmountBeforeWithholding + totalWithholdingTaxPLN);

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
