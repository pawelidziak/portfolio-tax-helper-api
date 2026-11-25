/**
 * Parser for dividends from the Interest and Withholding Tax sections
 *
 * Responsibilities:
 * - Merging data from the "Interest" (gross amount) and "Withholding Tax" (tax) sections
 * - Conversion to IBKRDividendDto[]
 * - Column mapping
 *
 * === LOGIC ===
 * Dividends in IBKR appear in two sections:
 * 1. "Interest" - gross dividend amount (e.g. "Dividend on QQQ")
 * 2. "Withholding Tax" - withholding tax (e.g. "Withholding @ 15% on Dividend")
 *
 * We must merge these two entries into one dividend record.
 */

import { createDataMap, removeQuotes, parseNumber, getValue } from '@utils';
import { CsvSection } from '@shared/models';

import { IBKRDividendDto } from '../../models/dto';

/**
 * Column names in the Interest and Withholding Tax sections
 */
enum CsvColumnNames {
  DESCRIPTION = 'Description',
  CURRENCY = 'Currency',
  AMOUNT = 'Amount',
  DATE = 'Date',
  CODE = 'Code',
}

/**
 * Parses the Dividends, Interest and Withholding Tax sections into IBKRDividendDto[]
 *
 * @param dividendsSection - Dividends section from the CSV (standard IBKR format)
 * @param interestSection - Interest section from the CSV (entries with "dividend" in the description)
 * @param withholdingTaxSection - Withholding Tax section from the CSV (optional)
 * @returns Array of dividends with merged data
 */
export const parseDividendsSection = (
  dividendsSection: CsvSection | undefined,
  interestSection: CsvSection | undefined,
  withholdingTaxSection: CsvSection | undefined
): IBKRDividendDto[] => {
  const dividends: IBKRDividendDto[] = [];

  // Parse Interest entries (gross amount)
  const interestEntries = [dividendsSection, interestSection].flatMap(section =>
    section ? parseInterestEntries(section) : []
  );

  // Parse Withholding Tax entries (tax)
  const withholdingTaxEntries = withholdingTaxSection
    ? parseWithholdingTaxEntries(withholdingTaxSection)
    : [];

  // Merge entries into dividends
  for (const interest of interestEntries) {
    // Find the matching tax entry (by date and symbol)
    const taxEntry = findMatchingTaxEntry(interest, withholdingTaxEntries);

    const grossAmount = interest.amount; // always positive
    const withholdingTaxAmount = taxEntry ? taxEntry.amount : 0; // always negative or 0
    const netAmount = grossAmount + withholdingTaxAmount; // withholdingTaxAmount is negative, so this is a subtraction

    dividends.push({
      currency: interest.currency,
      date: interest.date,
      symbol: interest.symbol,
      grossAmount,
      withholdingTaxAmount,
      netAmount,
    });
  }

  return dividends;
};

/**
 * Entry from the Withholding Tax section (withholding tax)
 */
interface WithholdingTaxEntry {
  currency: string;
  date: string;
  symbol: string;
  amount: number; // always negative
}

/**
 * Entry from the Interest section (gross dividend amount)
 */
interface InterestEntry {
  currency: string;
  date: string;
  symbol: string;
  amount: number;
}

/**
 * Parses entries from the Interest section (dividends only, not interest)
 */
const parseInterestEntries = (section: CsvSection): InterestEntry[] => {
  const entries: InterestEntry[] = [];

  for (const rowData of section.rows) {
    const entry = parseInterestRow(section.headers, rowData);
    if (entry) entries.push(entry);
  }

  return entries;
};

/**
 * Parses a single Interest row (dividends only)
 */
const parseInterestRow = (headers: string[], rowData: string[]): InterestEntry | null => {
  const dataMap = createDataMap(headers, rowData);

  // Check that this is not Total - Total may have "Total" in the Currency column or an empty currency
  const currency = getValue(dataMap, CsvColumnNames.CURRENCY);
  const currencyTrimmed = currency ? currency.trim() : '';
  if (!currencyTrimmed || currencyTrimmed.toLowerCase() === 'total') {
    return null; // Skip Total rows
  }

  const description = removeQuotes(
    getValue(dataMap, CsvColumnNames.DESCRIPTION) || ''
  ).toLowerCase();

  // Only entries with "dividend" in the description (skip "credit interest", "debit interest")
  if (!description.includes('dividend')) return null;

  const amount = parseNumber(getValue(dataMap, CsvColumnNames.AMOUNT));
  if (amount === null || amount === undefined || amount <= 0) return null;

  // Extract the symbol from the description (e.g. "Dividend on QQQ" -> "QQQ")
  const symbol = extractSymbolFromDescription(description);

  // Date validation - without a date we cannot find the NBP rate
  const date = getValue(dataMap, CsvColumnNames.DATE);
  if (!date || date.trim() === '') {
    return null; // Skip entries without a date
  }

  return {
    currency: removeQuotes(currencyTrimmed),
    date: date.trim(),
    symbol,
    amount,
  };
};

/**
 * Parses entries from the Withholding Tax section (dividends only)
 */
const parseWithholdingTaxEntries = (section: CsvSection): WithholdingTaxEntry[] => {
  const entries: WithholdingTaxEntry[] = [];

  for (const rowData of section.rows) {
    const entry = parseWithholdingTaxRow(section.headers, rowData);
    if (entry) entries.push(entry);
  }

  return entries;
};

/**
 * Parses a single Withholding Tax row (dividends only)
 */
const parseWithholdingTaxRow = (
  headers: string[],
  rowData: string[]
): WithholdingTaxEntry | null => {
  const dataMap = createDataMap(headers, rowData);

  // Check that this is not Total - Total may have "Total" in the Currency column or an empty currency
  const currency = getValue(dataMap, CsvColumnNames.CURRENCY);
  const currencyTrimmed = currency ? currency.trim() : '';
  if (!currencyTrimmed || currencyTrimmed.toLowerCase() === 'total') {
    return null; // Skip Total rows
  }

  const description = removeQuotes(
    getValue(dataMap, CsvColumnNames.DESCRIPTION) || ''
  ).toLowerCase();

  // Only entries with "dividend" in the description (skip "credit interest")
  if (!description.includes('dividend')) return null;

  const amount = parseNumber(getValue(dataMap, CsvColumnNames.AMOUNT));
  if (amount === null || amount === undefined || amount >= 0) return null; // tax is always negative

  // Extract the symbol from the description (e.g. "Withholding @ 15% on Dividend QQQ" -> "QQQ")
  const symbol = extractSymbolFromDescription(description);

  // Date validation - without a date we cannot find the NBP rate
  const date = getValue(dataMap, CsvColumnNames.DATE);
  if (!date || date.trim() === '') {
    return null; // Skip entries without a date
  }

  return {
    currency: removeQuotes(currencyTrimmed),
    date: date.trim(),
    symbol,
    amount, // always negative
  };
};

/**
 * Extracts the symbol from the dividend description
 * Examples:
 * - "KO(US1912161007) Cash Dividend USD 0.51 per Share" -> "KO"
 * - "Dividend on QQQ" -> "QQQ"
 * - "Withholding @ 15% on Dividend QQQ" -> "QQQ"
 */
const extractSymbolFromDescription = (description: string): string => {
  // Look for patterns like "KO(US1912161007) Cash Dividend ...", "on QQQ", "Dividend QQQ", etc.
  const patterns = [
    /^([a-z0-9.]+)\(/i, // "KO(US1912161007) Cash Dividend USD 0.51 per Share"
    /on\s+([A-Z]+)/i, // "on QQQ"
    /dividend\s+([A-Z]+)/i, // "Dividend QQQ"
    /@\s+\d+%\s+on\s+dividend\s+([A-Z]+)/i, // "Withholding @ 15% on Dividend QQQ"
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
  }

  // If nothing was found, return an empty string
  return '';
};

/**
 * Finds the matching tax entry for a dividend
 */
const findMatchingTaxEntry = (
  interest: InterestEntry,
  taxEntries: WithholdingTaxEntry[]
): WithholdingTaxEntry | undefined => {
  return taxEntries.find(
    tax =>
      tax.currency === interest.currency &&
      tax.date === interest.date &&
      tax.symbol === interest.symbol
  );
};
