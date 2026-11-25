/**
 * Service for fetching currency exchange rates from the NBP API
 *
 * API documentation: https://api.nbp.pl/
 *
 * Single Responsibility: Communication with the NBP API and exchange rate management
 */

import { getPreviousDay } from '@utils';

import { NBPRateResponseDto } from '../models/dto/nbp-rate-response.dto';
import { CurrencyEnum } from '../models';

const NBP_API = {
  BASE_URL: process.env.NBP_API_BASE_URL || 'https://api.nbp.pl/api',
  TABLE_TYPE: process.env.NBP_API_TABLE_TYPE || 'a', // Table A - average exchange rates
  FORMAT: process.env.NBP_API_FORMAT || 'json',
  PLN_RATE: Number(process.env.NBP_API_PLN_RATE) || 1.0, // PLN as the base currency
};

/** NBP rejects ranges over 367 days with HTTP 400, so longer ranges are fetched in chunks. */
const NBP_MAX_RANGE_DAYS = 360;

/**
 * NBP exchange rate cache
 * Structure: currency -> date -> rate
 */
export type ExchangeRatesCache = Map<string, Map<string, number>>;

/**
 * Fetches exchange rates from the NBP API for a given currency and date range
 *
 * The NBP API returns ONLY business days (Mon-Fri).
 * findNBPRate() recursively looks for an available rate, stepping back 1 day at a time.
 */
const fetchExchangeRatesChunk = async (
  currency: string,
  startDate: string,
  endDate: string
): Promise<Map<string, number>> => {
  const ratesMap = new Map<string, number>();

  // PLN = 1.0 (base currency) - findNBPRate() returns 1.0 automatically
  if (isPLN(currency)) return ratesMap;

  const currencyCode = currency.toLowerCase();
  const url = `${NBP_API.BASE_URL}/exchangerates/rates/${NBP_API.TABLE_TYPE}/${currencyCode}/${startDate}/${endDate}/?format=${NBP_API.FORMAT}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`⚠️  Failed to fetch NBP rates for ${currency}`);
      return ratesMap;
    }

    const data = (await response.json()) as NBPRateResponseDto;

    // Map effectiveDate -> mid (business days only, from the API)
    for (const rate of data.rates) {
      ratesMap.set(rate.effectiveDate, rate.mid);
    }

    return ratesMap;
  } catch (error) {
    console.warn(`❌ Error fetching NBP rates for ${currency}:`, error);
    return ratesMap;
  }
};

/**
 * Splits an inclusive date range into consecutive chunks of at most `maxDays` days (Pure Function)
 */
export const splitDateRange = (
  startDate: string,
  endDate: string,
  maxDays: number = NBP_MAX_RANGE_DAYS
): { startDate: string; endDate: string }[] => {
  const chunks: { startDate: string; endDate: string }[] = [];
  let chunkStart = startDate;

  while (chunkStart <= endDate) {
    const chunkEnd = getPreviousDay(chunkStart, -(maxDays - 1));
    const boundedEnd = chunkEnd < endDate ? chunkEnd : endDate;
    chunks.push({ startDate: chunkStart, endDate: boundedEnd });
    chunkStart = getPreviousDay(boundedEnd, -1);
  }

  return chunks;
};

const fetchExchangeRates = async (
  currency: string,
  startDate: string,
  endDate: string
): Promise<Map<string, number>> => {
  const ratesMap = new Map<string, number>();

  for (const chunk of splitDateRange(startDate, endDate)) {
    const chunkRates = await fetchExchangeRatesChunk(currency, chunk.startDate, chunk.endDate);
    chunkRates.forEach((rate, date) => ratesMap.set(date, rate));
  }

  return ratesMap;
};

/**
 * Fetches exchange rates for the given currencies and date range
 *
 * @param currencies - List of currencies to fetch
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Rate cache: currency -> date -> rate (business days ONLY)
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
 * Recursively looks for the first available NBP rate (Pure Function)
 *
 * Steps back 1 day at a time until a rate is found or the max attempts are reached.
 *
 * @param ratesCache - NBP rate cache
 * @param currency - Currency
 * @param date - Start date (YYYY-MM-DD)
 * @param attempt - Attempt counter (max 10)
 * @returns Object { date, rate } or undefined
 */
export const findNBPRate = (
  ratesCache: ExchangeRatesCache,
  currency: string,
  date: string,
  attempt: number = 0
): { date: string; rate: number } | undefined => {
  // PLN is always = 1.0
  if (isPLN(currency)) return { date, rate: NBP_API.PLN_RATE };

  // Max 10 attempts
  if (attempt >= 10) return undefined;

  // Check whether a rate exists for this date
  const rate = ratesCache.get(currency)?.get(date);
  if (rate) return { date, rate };

  // Step back 1 day and search again (recursion)
  const previousDate = getPreviousDay(date);
  return findNBPRate(ratesCache, currency, previousDate, attempt + 1);
};

/**
 * Checks whether the currency is PLN (Pure Function)
 */
const isPLN = (currency: string): boolean => currency.toUpperCase() === CurrencyEnum.PLN;
