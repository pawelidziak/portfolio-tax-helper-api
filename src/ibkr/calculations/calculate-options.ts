/**
 * Czyste funkcje kalkulacyjne dla opcji
 *
 * Implementuje logikę podatkową dla opcji używając rzeczywistych danych z IBKRTradeDto.
 * Wszystkie wartości zwracane są w PLN.
 * Wszystkie funkcje są pure (brak I/O, HTTP, disk reads).
 *
 * === KODY Z IBKR ===
 * - O: Opening (otwarcie pozycji)
 * - C: Closing (zamknięcie pozycji)
 * - C;Ep: Closing/Expired (zamknięcie przez wygaśnięcie)
 * - C;A lub A;C: Closing/Assignment (zamknięcie przez assignment)
 * - C;P: Closing/Partial (częściowe zamknięcie)
 *
 * === STRUKTURA DANYCH ===
 * - quantity < 0 + proceeds > 0 = SHORT (sprzedaż opcji)
 * - quantity > 0 + proceeds < 0 = LONG (zakup opcji)
 * - tradePrice = premia za kontrakt
 * - contractMultiplier = 100 (standardowo dla opcji equity)
 * - symbol zawiera CALL/PUT: "QQQ 04NOV25 615 P" (P=PUT, C=CALL)
 */

import { TaxSummary } from '@shared/models';
import { IBKRTradeDto } from '@ibkr';

/**
 * Oblicza wynik podatkowy dla pojedynczej transakcji opcji
 *
 * === ANALIZA WSZYSTKICH SCENARIUSZY (bez użycia basis) ===
 *
 * 1. OPENING (O) - Otwarcie pozycji:
 *    A) SHORT (wystawienie opcji): proceeds > 0
 *       Przykład: proceeds=100, commission=-10
 *       → revenue = 100 (premia otrzymana)
 *       → cost = 10 (prowizja)
 *       → income = 90
 *
 *    B) LONG (zakup opcji): proceeds < 0
 *       Przykład: proceeds=-500, commission=-10
 *       → revenue = 0 (brak przychodu przy zakupie)
 *       → cost = 510 (premia + prowizja)
 *       → income = -510
 *
 * 2. CLOSING/Expired (C;Ep) - Opcja wygasła:
 *    Wszystko już zaliczone przy OPENING, więc nie liczymy nic
 *    Przykład: Wystawiłem opcję (O) → revenue=100, cost=10, income=90
 *              Opcja wygasła (C;Ep) → revenue=0, cost=0, income=0
 *
 * 3. CLOSING (C) - Zamknięcie przez kupno/sprzedaż:
 *    A) SHORT closing: płacimy, żeby odkupić opcję (proceeds < 0)
 *       Przykład: proceeds=-20, commission=-5
 *       → revenue = 0 (płacimy, więc brak przychodu)
 *       → cost = 25 (premia zapłacona + prowizja)
 *       → income = -25
 *       CAŁKOWITY wynik (O + C): revenue=100, cost=35, income=65
 *
 *    B) LONG closing: otrzymujemy, sprzedając opcję (proceeds > 0)
 *       Przykład: proceeds=800, commission=-5
 *       → revenue = 800 (premia otrzymana)
 *       → cost = 5 (prowizja)
 *       → income = 795
 *       CAŁKOWITY wynik (O + C): revenue=800, cost=515, income=285
 *
 * 4. CLOSING/Partial (C;P) - Częściowe zamknięcie:
 *    Tak samo jak CLOSING (C), ale dla części pozycji
 *
 * 5. CLOSING/Assignment (C;A, A;C) - Opcja wykonana:
 *    Premia już zaliczona w OPENING, stock leg obsługiwany osobno
 *    Przykład: Wystawiłem opcję (O) → revenue=100, cost=10, income=90
 *              Opcja wykonana (C;A) → revenue=0, cost=0, income=0
 *              Stock leg (A;O) → obsługiwany w calculate-stocks.ts
 *
 * 6. A;O (Assignment/Opening) - Otwarcie pozycji przez assignment:
 *    To jest stock leg, nie opcja leg - obsługiwany w calculate-stocks.ts
 */
export function calculateOptionResult(trade: IBKRTradeDto, fxRateToPLN: number): TaxSummary {
  const code = trade.code || '';
  const proceeds = trade.proceeds || 0;
  const commissionFee = trade.commissionFee || 0;
  const absCommission = Math.abs(commissionFee);

  // OPENING: premia otrzymana lub zapłacona
  if (code.includes('O') && !code.includes('A')) {
    // SHORT: proceeds > 0 (otrzymujemy premię)
    if (proceeds > 0) {
      const revenue = proceeds * fxRateToPLN;
      const cost = absCommission * fxRateToPLN;
      const income = revenue - cost;
      return { revenue, cost, income };
    }
    // LONG: proceeds < 0 (płacimy premię)
    if (proceeds < 0) {
      const revenue = 0;
      const cost = (-proceeds + absCommission) * fxRateToPLN;
      const income = revenue - cost;
      return { revenue, cost, income };
    }
  }

  // CLOSING z ASSIGNMENT (C;A, A;C): pomijamy (premia już zaliczona w Opening)
  // Stock leg obsługiwany osobno w calculate-stocks.ts
  if (code.includes('C') && code.includes('A')) {
    return { revenue: 0, cost: 0, income: 0 };
  }

  // CLOSING/Expired (C;Ep): opcja wygasła bez wartości
  // Wszystko już zaliczone przy OPENING, więc nie liczymy nic
  // Przykład: Wystawiłem opcję (O) → revenue=100, cost=10, income=90
  //          Opcja wygasła (C;Ep) → revenue=0, cost=0, income=0
  if (code.includes('C') && code.includes('Ep')) {
    return { revenue: 0, cost: 0, income: 0 };
  }

  // CLOSING (C, C;P): zamknięcie pozycji przez kupno/sprzedaż
  // Obliczamy różnicę między otwarciem a zamknięciem
  // Używamy proceeds i commission z closing, bo opening już został zaliczony
  if (code.includes('C') && !code.includes('A') && !code.includes('Ep')) {
    // SHORT closing: płacimy, żeby odkupić opcję (proceeds < 0)
    if (proceeds < 0) {
      // Revenue = 0 (płacimy, więc brak przychodu)
      const revenue = 0;
      // Cost = premia zapłacona + prowizja
      const cost = (-proceeds + absCommission) * fxRateToPLN;
      const income = revenue - cost;
      return { revenue, cost, income };
    }
    // LONG closing: otrzymujemy, sprzedając opcję (proceeds > 0)
    if (proceeds > 0) {
      // Revenue = premia otrzymana
      const revenue = proceeds * fxRateToPLN;
      // Cost = prowizja
      const cost = absCommission * fxRateToPLN;
      const income = revenue - cost;
      return { revenue, cost, income };
    }
    // proceeds = 0 (teoretycznie możliwe)
    if (proceeds === 0) {
      return {
        revenue: 0,
        cost: absCommission * fxRateToPLN,
        income: -absCommission * fxRateToPLN,
      };
    }
  }

  // Nieznany kod lub brak danych
  return { revenue: 0, cost: 0, income: 0 };
}
