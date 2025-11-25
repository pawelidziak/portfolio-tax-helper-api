/**
 * Czyste funkcje kalkulacyjne dla akcji/ETF
 *
 * Implementuje logikę podatkową dla akcji używając rzeczywistych danych z IBKRTradeDto.
 * Wszystkie wartości zwracane są w PLN.
 * Wszystkie funkcje są pure (brak I/O, HTTP, disk reads).
 *
 * === KODY Z IBKR ===
 * - O: Opening (zakup akcji)
 * - C: Closing (sprzedaż akcji)
 * - C;P: Closing/Partial (częściowa sprzedaż)
 * - A;O: Assignment/Opening (assignment przy otwarciu - z opcji)
 *
 * === STRUKTURA DANYCH ===
 * - quantity < 0 + proceeds > 0 = SPRZEDAŻ (SHORT dla short sell)
 * - quantity > 0 + proceeds < 0 = ZAKUP (LONG)
 * - tradePrice = cena za akcję
 * - realizedPL zawiera już WSZYSTKO (różnica cen + prowizje)
 */

import { TaxSummary } from '@shared/models';
import { IBKRTradeDto } from '@ibkr';

/**
 * Oblicza wynik podatkowy dla pojedynczej transakcji akcji
 *
 * Dla OPENING (O, A;O):
 * - Nie rozpoznajemy jeszcze przychodu ani kosztu
 * - Dopiero przy zamknięciu poznamy wynik
 * → revenue = 0, cost = 0, income = 0
 *
 * Dla CLOSING (C, C;P):
 * - IBKR podaje realizedPL (zysk/strata) już uwzględniający wszystko
 * - realizedPL > 0: zysk ze sprzedaży → revenue = realizedPL, cost = 0
 * - realizedPL < 0: strata ze sprzedaży → revenue = 0, cost = -realizedPL
 */
export function calculateStocksResult(trade: IBKRTradeDto, fxRateToPLN: number): TaxSummary {
  const code = trade.code || '';

  // OPENING: zakup akcji - jeszcze bez wyniku
  if (code.includes('O')) {
    return { revenue: 0, cost: 0, income: 0 };
  }

  // CLOSING: sprzedaż akcji - realizujemy zysk/stratę
  if (code.includes('C') && trade.realizedPL !== undefined) {
    const realizedPL = trade.realizedPL;

    const revenue = realizedPL >= 0 ? realizedPL * fxRateToPLN : 0;
    const cost = realizedPL < 0 ? -realizedPL * fxRateToPLN : 0;
    const income = realizedPL * fxRateToPLN;

    return { revenue, cost, income };
  }

  // Nieznany kod lub brak danych
  return { revenue: 0, cost: 0, income: 0 };
}

/**
 * Oblicza wynik podatkowy dla SHORT pozycji (short sell then buy to cover)
 *
 * Używa dwóch transakcji: shortSell (O) i buyToCover (C).
 * Dla shortSell: revenue = 0, cost = 0, profit = 0 (jeszcze bez wyniku)
 * Dla buyToCover: używa realizedPL z IBKR
 */
export function calculateStockShortResult(params: {
  buyToCover: IBKRTradeDto;
  shortSell: IBKRTradeDto;
  fxRateToPLN: number;
}): TaxSummary {
  // ShortSell nie ma wyniku (O)
  // BuyToCover ma realizedPL (C)
  return calculateStocksResult(params.buyToCover, params.fxRateToPLN);
}

/**
 * Oblicza wynik podatkowy dla LONG pozycji (buy first, sell later)
 *
 * Używa dwóch transakcji: buy (O) i sell (C).
 * Dla buy: revenue = 0, cost = 0, profit = 0 (jeszcze bez wyniku)
 * Dla sell: używa realizedPL z IBKR
 */
export function calculateStockLongResult(params: {
  fxRateToPLN: number;
  sell: IBKRTradeDto;
  buy: IBKRTradeDto;
}): TaxSummary {
  // Buy nie ma wyniku (O)
  // Sell ma realizedPL (C)
  return calculateStocksResult(params.sell, params.fxRateToPLN);
}
