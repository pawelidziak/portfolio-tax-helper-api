/**
 * Parser dla dywidend z sekcji Interest i Withholding Tax
 *
 * Odpowiedzialność:
 * - Łączenie danych z sekcji "Interest" (kwota brutto) i "Withholding Tax" (podatek)
 * - Konwersja na IBKRDividendDto[]
 * - Mapowanie kolumn
 *
 * === LOGIKA ===
 * Dywidendy w IBKR są w dwóch sekcjach:
 * 1. "Interest" - kwota brutto dywidendy (np. "Dividend on QQQ")
 * 2. "Withholding Tax" - podatek u źródła (np. "Withholding @ 15% on Dividend")
 *
 * Musimy połączyć te dwa wpisy w jeden rekord dywidendy.
 */

import { createDataMap, removeQuotes, parseNumber, getValue } from '@utils';
import { CsvSection } from '@shared/models';

import { IBKRDividendDto } from '../../models/dto';

/**
 * Nazwy kolumn w sekcji Interest i Withholding Tax
 */
enum CsvColumnNames {
  DESCRIPTION = 'Description',
  CURRENCY = 'Currency',
  AMOUNT = 'Amount',
  DATE = 'Date',
  CODE = 'Code',
}

/**
 * Parsuje sekcje Interest i Withholding Tax na IBKRDividendDto[]
 *
 * @param interestSection - Sekcja Interest z CSV
 * @param withholdingTaxSection - Sekcja Withholding Tax z CSV (opcjonalna)
 * @returns Tablica dywidend z połączonymi danymi
 */
export const parseDividendsSection = (
  interestSection: CsvSection | undefined,
  withholdingTaxSection: CsvSection | undefined
): IBKRDividendDto[] => {
  const dividends: IBKRDividendDto[] = [];

  // Parsuj wpisy z Interest (kwota brutto)
  const interestEntries = interestSection ? parseInterestEntries(interestSection) : [];

  // Parsuj wpisy z Withholding Tax (podatek)
  const withholdingTaxEntries = withholdingTaxSection
    ? parseWithholdingTaxEntries(withholdingTaxSection)
    : [];

  // Połącz wpisy w dywidendy
  for (const interest of interestEntries) {
    // Znajdź odpowiadający wpis z podatkiem (po dacie i symbolu)
    const taxEntry = findMatchingTaxEntry(interest, withholdingTaxEntries);

    const grossAmount = interest.amount; // zawsze dodatnia
    const withholdingTaxAmount = taxEntry ? taxEntry.amount : 0; // zawsze ujemna lub 0
    const netAmount = grossAmount + withholdingTaxAmount; // withholdingTaxAmount jest ujemne, więc to odejmowanie

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
 * Wpis z sekcji Withholding Tax (podatek u źródła)
 */
interface WithholdingTaxEntry {
  currency: string;
  date: string;
  symbol: string;
  amount: number; // zawsze ujemna
}

/**
 * Wpis z sekcji Interest (kwota brutto dywidendy)
 */
interface InterestEntry {
  currency: string;
  date: string;
  symbol: string;
  amount: number;
}

/**
 * Parsuje wpisy z sekcji Interest (tylko dywidendy, nie odsetki)
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
 * Parsuje pojedynczy wiersz z Interest (tylko dywidendy)
 */
const parseInterestRow = (headers: string[], rowData: string[]): InterestEntry | null => {
  const dataMap = createDataMap(headers, rowData);

  // Sprawdź czy to nie Total - Total może mieć "Total" w kolumnie Currency lub pustą walutę
  const currency = getValue(dataMap, CsvColumnNames.CURRENCY);
  const currencyTrimmed = currency ? currency.trim() : '';
  if (!currencyTrimmed || currencyTrimmed.toLowerCase() === 'total') {
    return null; // Pomijamy wiersze Total
  }

  const description = removeQuotes(
    getValue(dataMap, CsvColumnNames.DESCRIPTION) || ''
  ).toLowerCase();

  // Tylko wpisy z "dividend" w opisie (pomijamy "credit interest", "debit interest")
  if (!description.includes('dividend')) return null;

  const amount = parseNumber(getValue(dataMap, CsvColumnNames.AMOUNT));
  if (amount === null || amount === undefined || amount <= 0) return null;

  // Wyciągnij symbol z opisu (np. "Dividend on QQQ" -> "QQQ")
  const symbol = extractSymbolFromDescription(description);

  // Walidacja daty - bez daty nie możemy znaleźć kursu NBP
  const date = getValue(dataMap, CsvColumnNames.DATE);
  if (!date || date.trim() === '') {
    return null; // Pomijamy wpisy bez daty
  }

  return {
    currency: removeQuotes(currencyTrimmed),
    date: date.trim(),
    symbol,
    amount,
  };
};

/**
 * Parsuje wpisy z sekcji Withholding Tax (tylko dywidendy)
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
 * Parsuje pojedynczy wiersz z Withholding Tax (tylko dywidendy)
 */
const parseWithholdingTaxRow = (
  headers: string[],
  rowData: string[]
): WithholdingTaxEntry | null => {
  const dataMap = createDataMap(headers, rowData);

  // Sprawdź czy to nie Total - Total może mieć "Total" w kolumnie Currency lub pustą walutę
  const currency = getValue(dataMap, CsvColumnNames.CURRENCY);
  const currencyTrimmed = currency ? currency.trim() : '';
  if (!currencyTrimmed || currencyTrimmed.toLowerCase() === 'total') {
    return null; // Pomijamy wiersze Total
  }

  const description = removeQuotes(
    getValue(dataMap, CsvColumnNames.DESCRIPTION) || ''
  ).toLowerCase();

  // Tylko wpisy z "dividend" w opisie (pomijamy "credit interest")
  if (!description.includes('dividend')) return null;

  const amount = parseNumber(getValue(dataMap, CsvColumnNames.AMOUNT));
  if (amount === null || amount === undefined || amount >= 0) return null; // podatek jest zawsze ujemny

  // Wyciągnij symbol z opisu (np. "Withholding @ 15% on Dividend QQQ" -> "QQQ")
  const symbol = extractSymbolFromDescription(description);

  // Walidacja daty - bez daty nie możemy znaleźć kursu NBP
  const date = getValue(dataMap, CsvColumnNames.DATE);
  if (!date || date.trim() === '') {
    return null; // Pomijamy wpisy bez daty
  }

  return {
    currency: removeQuotes(currencyTrimmed),
    date: date.trim(),
    symbol,
    amount, // zawsze ujemna
  };
};

/**
 * Wyciąga symbol z opisu dywidendy
 * Przykłady:
 * - "Dividend on QQQ" -> "QQQ"
 * - "Withholding @ 15% on Dividend QQQ" -> "QQQ"
 */
const extractSymbolFromDescription = (description: string): string => {
  // Szukaj wzorców typu "on QQQ", "Dividend QQQ", etc.
  const patterns = [
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

  // Jeśli nie znaleziono, zwróć pusty string
  return '';
};

/**
 * Znajduje odpowiadający wpis z podatkiem dla dywidendy
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
