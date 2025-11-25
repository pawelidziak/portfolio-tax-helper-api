/**
 * Czyste funkcje kalkulacyjne dla opłat za pożyczkę akcji (Borrow Fee)
 *
 * Implementuje logikę podatkową dla opłat za pożyczkę akcji.
 * Wszystkie wartości zwracane są w PLN.
 * Wszystkie funkcje są pure (brak I/O, HTTP, disk reads).
 *
 * === STRUKTURA DANYCH ===
 * Borrow Fee to koszt pożyczki akcji (short selling).
 * - borrowFee jest zawsze ujemny (koszt dla pożyczkobiorcy)
 * - Traktujemy to jako ujemne odsetki (koszt)
 *
 * === LOGIKA PODATKOWA ===
 * Dla Borrow Fee:
 * - revenue = 0 (brak przychodu)
 * - cost = |borrowFee| (koszt pożyczki)
 * - income = -cost (ujemny, bo to koszt)
 */

import { TaxSummary } from '@shared/models';
import { IBKRBorrowDto } from '@ibkr';

/**
 * Oblicza wynik podatkowy dla opłaty za pożyczkę akcji
 *
 * @param borrow - Opłata za pożyczkę z IBKR
 * @param fxRateToPLN - Kurs wymiany waluty na PLN (NBP)
 * @returns TaxSummary z revenue, cost, income w PLN
 */
export function calculateBorrowResult(borrow: IBKRBorrowDto, fxRateToPLN: number): TaxSummary {
  // borrowFee jest zawsze ujemny, więc używamy wartości bezwzględnej jako koszt
  const borrowFeeAbs = Math.abs(borrow.borrowFee);

  const revenue = 0; // brak przychodu
  const cost = borrowFeeAbs * fxRateToPLN; // koszt pożyczki
  const income = revenue - cost; // ujemny

  return { revenue, cost, income };
}
