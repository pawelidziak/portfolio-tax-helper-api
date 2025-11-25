/**
 * Serwis do pobierania kursów walut z API NBP
 *
 * Dokumentacja API: https://api.nbp.pl/
 *
 * Single Responsibility: Komunikacja z API NBP i zarządzanie kursami walut
 */

import { getPreviousDay } from '@utils';

import { NBPRateResponseDto } from '../models/dto/nbp-rate-response.dto';
import { CurrencyEnum } from '../models';

const NBP_API = {
  BASE_URL: process.env.NBP_API_BASE_URL || 'https://api.nbp.pl/api',
  TABLE_TYPE: process.env.NBP_API_TABLE_TYPE || 'a', // Tabela A - średnie kursy walut
  FORMAT: process.env.NBP_API_FORMAT || 'json',
  PLN_RATE: Number(process.env.NBP_API_PLN_RATE) || 1.0, // PLN jako waluta bazowa
};

/**
 * Cache kursów walut NBP
 * Struktura: waluta -> data -> kurs
 */
export type ExchangeRatesCache = Map<string, Map<string, number>>;

/**
 * Pobiera kursy wymiany z API NBP dla danej waluty i zakresu dat
 *
 * API NBP zwraca TYLKO dni robocze (pon-pt).
 * findNBPRate() rekurencyjnie szuka dostępnego kursu, cofając się po 1 dniu.
 */
const fetchExchangeRates = async (
  currency: string,
  startDate: string,
  endDate: string
): Promise<Map<string, number>> => {
  const ratesMap = new Map<string, number>();

  // PLN = 1.0 (waluta bazowa) - findNBPRate() zwróci 1.0 automatycznie
  if (isPLN(currency)) return ratesMap;

  const currencyCode = currency.toLowerCase();
  const url = `${NBP_API.BASE_URL}/exchangerates/rates/${NBP_API.TABLE_TYPE}/${currencyCode}/${startDate}/${endDate}/?format=${NBP_API.FORMAT}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`⚠️  Nie udało się pobrać kursów NBP dla ${currency}`);
      return ratesMap;
    }

    const data = (await response.json()) as NBPRateResponseDto;

    // Mapuj effectiveDate -> mid (tylko dni robocze z API)
    for (const rate of data.rates) {
      ratesMap.set(rate.effectiveDate, rate.mid);
    }

    return ratesMap;
  } catch (error) {
    console.warn(`❌ Błąd pobierania kursów NBP dla ${currency}:`, error);
    return ratesMap;
  }
};

/**
 * Pobiera kursy walut dla podanych walut i zakresu dat
 *
 * @param currencies - Lista walut do pobrania
 * @param startDate - Data początkowa (YYYY-MM-DD)
 * @param endDate - Data końcowa (YYYY-MM-DD)
 * @returns Cache z kursami: waluta -> data -> kurs (TYLKO dni robocze)
 */
export const getExchangeRates = async (
  currencies: Set<string>,
  startDate: string,
  endDate: string,
  bufferDays: number = 10
): Promise<ExchangeRatesCache> => {
  const cache: ExchangeRatesCache = new Map();

  for (const currency of currencies) {
    const startDateWithBuffer = getPreviousDay(startDate, bufferDays);
    const rates = await fetchExchangeRates(currency, startDateWithBuffer, endDate);
    cache.set(currency, rates);
  }

  return cache;
};

/**
 * Rekurencyjnie szuka pierwszego dostępnego kursu NBP (Pure Function)
 *
 * Cofa się o 1 dzień wstecz do znalezienia kursu lub osiągnięcia max prób.
 *
 * @param ratesCache - Cache z kursami NBP
 * @param currency - Waluta
 * @param date - Data początkowa (YYYY-MM-DD)
 * @param attempt - Licznik prób (max 10)
 * @returns Obiekt { date, rate } lub undefined
 */
export const findNBPRate = (
  ratesCache: ExchangeRatesCache,
  currency: string,
  date: string,
  attempt: number = 0
): { date: string; rate: number } | undefined => {
  // PLN zawsze = 1.0
  if (isPLN(currency)) return { date, rate: NBP_API.PLN_RATE };

  // Max 10 prób
  if (attempt >= 10) return undefined;

  // Sprawdź czy jest kurs dla tej daty
  const rate = ratesCache.get(currency)?.get(date);
  if (rate) return { date, rate };

  // Cofnij się o 1 dzień i szukaj ponownie (rekurencja)
  const previousDate = getPreviousDay(date);
  return findNBPRate(ratesCache, currency, previousDate, attempt + 1);
};

/**
 * Sprawdza czy waluta to PLN (Pure Function)
 */
const isPLN = (currency: string): boolean => currency.toUpperCase() === CurrencyEnum.PLN;
