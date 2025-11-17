/**
 * Kalkulacje finansowe dla opcji
 *
 * Single Responsibility: Obliczanie revenue, cost, income dla transakcji opcjami
 *
 * === TERMINOLOGIA KSIĘGOWA ===
 *
 * PRZYCHÓD (revenue):
 * Pieniądze wpływające do inwestora (zawsze wartość dodatnia):
 * - Premia otrzymana ze sprzedaży opcji (proceeds > 0)
 * - Zamknięcie pozycji z zyskiem
 *
 * KOSZT (cost):
 * Pieniądze wypływające od inwestora (zawsze wartość dodatnia):
 * - Premia zapłacona za zakup opcji (proceeds < 0)
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
 * proceeds:
 * - Kwota otrzymana (sprzedaż) lub zapłacona (zakup)
 * - Dodatnie dla sprzedaży (pieniądze wpływają)
 * - Ujemne dla zakupu (pieniądze wypływają)
 *
 * commissionFee:
 * - Prowizja maklerska
 * - Zawsze ujemna w danych IBKR
 * - Używamy Math.abs() aby traktować jako dodatni koszt
 *
 * basis:
 * - Koszt bazowy pozycji (wartość księgowa)
 * - Używane GŁÓWNIE dla opcji w dwóch scenariuszach:
 *
 *   A) OPENING (otwarcie pozycji):
 *      - basis = proceeds + commissionFee (IBKR oblicza to za nas)
 *      - Obliczamy revenue, cost, income osobno:
 *        * revenue = max(0, proceeds) - premia otrzymana (sprzedaż)
 *        * cost = max(0, -proceeds) + |commissionFee| - premia zapłacona + prowizja
 *        * income = revenue - cost
 *      - Przykład sprzedaży: proceeds=100, commission=-1 → revenue=100, cost=1, income=99 (zysk)
 *      - Przykład zakupu: proceeds=-50, commission=-1 → revenue=0, cost=51, income=-51 (koszt)
 *
 *   B) CLOSING (zamknięcie pozycji):
 *      - basis zawiera oryginalny koszt otwarcia pozycji
 *      - Używamy -basis + realizedPL aby obliczyć całkowity wynik
 *      - totalPL = -basis + realizedPL
 *      - Przykład: basis=-99 (sprzedaliśmy za 99), realizedPL=20 → totalPL=99+20=119
 *
 * realizedPL:
 * - Zrealizowany zysk/strata z zamknięcia pozycji
 * - Dodatnie dla zysku, ujemne dla straty
 * - Dla opcji: różnica między ceną zamknięcia a otwarciem
 */

import { IBKRTradeDto, TradeSummary } from '@models';

/**
 * Oblicza finanse dla opcji (Pure Function)
 *
 * Opcje mają 3 scenariusze księgowe:
 *
 * 1. OPENING (O) - otwarcie pozycji:
 *    - proceeds > 0: SPRZEDAŻ opcji (otrzymujemy premię)
 *      → revenue = proceeds (premia jako przychód)
 *      → cost = |commissionFee| (prowizja jako koszt)
 *      → income = revenue - cost (zysk)
 *    - proceeds < 0: ZAKUP opcji (płacimy premię)
 *      → revenue = 0 (brak przychodu)
 *      → cost = -proceeds + |commissionFee| (premia + prowizja jako koszt)
 *      → income = revenue - cost (koszt, ujemny)
 *
 * 2. CLOSING z ASSIGNMENT (C;A) - opcja wykonana:
 *    - Premia z otwarcia już została zaliczona w Opening
 *    - Pomijamy, aby uniknąć podwójnego liczenia
 *    → revenue = 0, cost = 0, income = 0
 *
 * 3. CLOSING bez Assignment (C) - zamknięcie pozycji:
 *    - Realizujemy całkowity wynik z całej operacji (otwarcie + zamknięcie)
 *    - basis: oryginalny koszt otwarcia pozycji (z Opening)
 *    - realizedPL: wynik z zamknięcia (różnica cen)
 *    - totalPL = -basis + realizedPL (suma obu nóg transakcji)
 *    → Jeśli totalPL > 0: zysk (revenue = totalPL, cost = 0)
 *    → Jeśli totalPL < 0: strata (revenue = 0, cost = -totalPL)
 */
export const calculateOptionsSummary = (trade: IBKRTradeDto, nbpRate: number): TradeSummary => {
  const code = trade.code || '';

  // OPENING: premia otrzymana lub zapłacona
  if (code.includes('O') && trade.proceeds !== undefined) {
    const revenueInCurrency = Math.max(0, trade.proceeds); // premia tylko gdy proceeds > 0 (sprzedaż)
    const costInCurrency = Math.max(0, -trade.proceeds) + Math.abs(trade.commissionFee || 0); // premia zakupu + prowizja
    const incomeInCurrency = revenueInCurrency - costInCurrency; // income = revenue - cost

    return {
      revenue: revenueInCurrency * nbpRate,
      cost: costInCurrency * nbpRate,
      income: incomeInCurrency * nbpRate,
    };
  }

  // CLOSING z ASSIGNMENT: pomijamy (premia już zaliczona w Opening)
  if (code.includes('C') && code.includes('A')) {
    return { revenue: 0, cost: 0, income: 0 };
  }

  // CLOSING: zysk/strata z zamknięcia pozycji
  if (code.includes('C') && trade.basis !== undefined && trade.realizedPL !== undefined) {
    // -basis: cofamy koszt otwarcia (aby dodać do wyniku zamknięcia)
    // +realizedPL: wynik z zamknięcia
    // = całkowity wynik z pełnej operacji (otwarcie + zamknięcie)
    const totalPLInCurrency = -trade.basis + trade.realizedPL;

    // Oblicz revenue, cost, income w walucie transakcji
    const revenueInCurrency = totalPLInCurrency >= 0 ? totalPLInCurrency : 0;
    const costInCurrency = totalPLInCurrency < 0 ? -totalPLInCurrency : 0;
    const incomeInCurrency = totalPLInCurrency;

    return {
      revenue: revenueInCurrency * nbpRate,
      cost: costInCurrency * nbpRate,
      income: incomeInCurrency * nbpRate,
    };
  }

  return { revenue: undefined, cost: undefined, income: undefined };
};
