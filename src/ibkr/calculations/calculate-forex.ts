/**
 * Czyste funkcje kalkulacyjne dla operacji wymiany walut (Forex)
 *
 * Implementuje logikę podatkową dla transakcji wymiany walut z sekcji Trades.
 * Wszystkie wartości zwracane są w PLN.
 * Wszystkie funkcje są pure (brak I/O, HTTP, disk reads).
 *
 * === STRUKTURA DANYCH ===
 * Forex transakcje są w sekcji Trades z Asset Category = "Forex"
 * - Symbol: np. "USD.PLN" (wymiana USD na PLN) lub "PLN.USD" (wymiana PLN na USD)
 * - Currency: waluta transakcji (PLN lub USD)
 * - Quantity: ilość waluty bazowej
 * - Proceeds: kwota w walucie docelowej
 *
 * === LOGIKA PODATKOWA ===
 * W Polsce wymiana walut (fiat -> fiat) sama w sobie NIE generuje przychodu/kosztu podatkowego.
 * To jest po prostu zamiana jednej waluty na drugą (np. PLN -> USD, USD -> PLN).
 *
 * Transakcje Forex w IBKR są zazwyczaj:
 * - Wymiana walut do zakupu akcji (PLN -> USD, żeby kupić akcje w USD)
 * - Wymiana walut po sprzedaży akcji (USD -> PLN, po sprzedaży akcji w USD)
 *
 * Te wymiany walut są częścią transakcji na akcjach, a nie osobnymi transakcjami podatkowymi.
 * Różnica kursowa jest już uwzględniona w realizedPL z transakcji na akcjach/opcjach.
 *
 * Dlatego dla Forex zawsze zwracamy: revenue = 0, cost = 0, income = 0
 */

import { TaxSummary } from '@shared/models';
import { IBKRTradeDto } from '@ibkr';

/**
 * Oblicza wynik podatkowy dla transakcji wymiany walut
 *
 * Wymiana walut (fiat -> fiat) nie generuje przychodu/kosztu podatkowego.
 * To jest tylko zamiana jednej waluty na drugą.
 * Różnica kursowa jest już uwzględniona w realizedPL z transakcji na akcjach/opcjach.
 *
 * @param _trade - Transakcja Forex z IBKR (nieużywany)
 * @param _fxRateToPLN - Kurs wymiany waluty transakcji na PLN (NBP) (nieużywany)
 * @returns TaxSummary z revenue = 0, cost = 0, income = 0
 */
export function calculateForexResult(_trade: IBKRTradeDto, _fxRateToPLN: number): TaxSummary {
  // Wymiana walut (fiat -> fiat) nie generuje przychodu/kosztu podatkowego
  // To jest tylko zamiana jednej waluty na drugą
  // Różnica kursowa jest już uwzględniona w realizedPL z transakcji na akcjach/opcjach
  return { revenue: 0, cost: 0, income: 0 };
}
