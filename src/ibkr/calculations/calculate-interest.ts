/**
 * Czyste funkcje kalkulacyjne dla odsetek
 *
 * Implementuje logikę podatkową dla:
 * - Positive interest (odsetki od wolnej gotówki - IBKR płaci)
 * - Negative interest (odsetki od marży/kredytu - IBKR pobiera)
 *
 * Wszystkie wartości zwracane są w PLN.
 * Wszystkie funkcje są pure (brak I/O, HTTP, disk reads).
 *
 * === STRUKTURA DANYCH ===
 * Odsetki są w sekcji "Interest" w raporcie IBKR.
 * Dla uproszczenia przyjmujemy model z polami:
 * - kind: POSITIVE lub NEGATIVE
 * - amount: zawsze dodatnia liczba w walucie oryginalnej
 */

import { TaxSummary } from '@shared/models';

/**
 * Typ pomocniczy dla odsetek
 * W rzeczywistości dane pochodzą z sekcji "Interest" w IBKR
 */
export interface InterestLike {
  kind: 'POSITIVE' | 'NEGATIVE';
  amount: number; // zawsze dodatnia liczba w walucie oryginalnej
  currency: string;
  fxRateToPLN: number;
}

/**
 * Oblicza wynik podatkowy dla odsetek
 *
 * POSITIVE (IBKR płaci - credit interest):
 * - revenue = amount * fxRateToPLN
 * - cost = 0
 * - income = revenue
 *
 * NEGATIVE (IBKR pobiera - margin interest, debit interest):
 * - revenue = 0
 * - cost = amount * fxRateToPLN
 * - income = revenue - cost (ujemny)
 */
export function calculateInterestResult(op: InterestLike): TaxSummary {
  if (op.kind === 'POSITIVE') {
    const revenue = op.amount * op.fxRateToPLN;
    const cost = 0;
    const income = revenue;

    return { revenue, cost, income };
  } else {
    // NEGATIVE
    const revenue = 0;
    const cost = op.amount * op.fxRateToPLN;
    const income = revenue - cost; // ujemny

    return { revenue, cost, income };
  }
}
