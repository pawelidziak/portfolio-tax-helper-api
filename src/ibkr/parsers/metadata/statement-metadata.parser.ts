/**
 * Parser dla metadanych z sekcji Statement i Cash Report
 *
 * Odpowiedzialność:
 * - Wyciąganie zakresu dat z sekcji Statement
 * - Wyciąganie walut z sekcji Cash Report
 */

import { createDataMap, getValue } from '@utils';
import { CsvSection } from '@shared/models';

import { IBKRStatementMetadata } from '../../models/dto';

/**
 * Nazwy kolumn w sekcji Cash Report
 */
enum CashReportColumnNames {
  CURRENCY_SUMMARY = 'Currency Summary',
  CURRENCY = 'Currency',
}

/**
 * Nazwy kolumn w sekcji Statement
 */
enum StatementColumnNames {
  FIELD_VALUE = 'Field Value',
  FIELD_NAME = 'Field Name',
}

/**
 * Parsuje zakres dat z sekcji Statement
 *
 * Format: "January 1, 2025 - November 21, 2025"
 * Zwraca: { minDate: "2025-01-01", maxDate: "2025-11-21" }
 */
export const parseStatementPeriod = (
  statementSection: CsvSection | undefined
): { minDate: string; maxDate: string } => {
  if (!statementSection) {
    return { minDate: '', maxDate: '' };
  }

  // Znajdź wiersz z Period
  for (const rowData of statementSection.rows) {
    const dataMap = createDataMap(statementSection.headers, rowData);
    const fieldName = getValue(dataMap, StatementColumnNames.FIELD_NAME);

    if (fieldName === 'Period') {
      const periodValue = getValue(dataMap, StatementColumnNames.FIELD_VALUE);
      if (periodValue) {
        return parsePeriodString(periodValue);
      }
    }
  }

  return { minDate: '', maxDate: '' };
};

/**
 * Parsuje string okresu na daty (Pure Function)
 *
 * Format: "January 1, 2025 - November 21, 2025"
 * Zwraca: { minDate: "2025-01-01", maxDate: "2025-11-21" }
 */
const parsePeriodString = (period: string): { minDate: string; maxDate: string } => {
  // Usuń cudzysłowy jeśli są
  const cleanPeriod = period.replace(/^"|"$/g, '').trim();

  // Format: "January 1, 2025 - November 21, 2025"
  const parts = cleanPeriod.split(' - ');
  if (parts.length !== 2) {
    return { minDate: '', maxDate: '' };
  }

  const startDate = parseDateString(parts[0].trim());
  const endDate = parseDateString(parts[1].trim());

  return {
    minDate: startDate || '',
    maxDate: endDate || '',
  };
};

/**
 * Parsuje datę z formatu "January 1, 2025" na "2025-01-01" (Pure Function)
 *
 * Używa bardziej niezawodnej metody parsowania, która nie zależy od locale.
 * Format IBKR: "Month Day, Year" (np. "January 1, 2025")
 */
const parseDateString = (dateStr: string): string | null => {
  try {
    // Usuń cudzysłowy jeśli są
    const cleanDate = dateStr.replace(/^"|"$/g, '').trim();

    // Format: "January 1, 2025" lub "November 21, 2025"
    // Regex: (Month) (Day), (Year)
    const match = cleanDate.match(/^(\w+)\s+(\d+),\s+(\d+)$/);
    if (!match) {
      // Fallback do standardowego parsowania
      const date = new Date(cleanDate);
      if (isNaN(date.getTime())) {
        return null;
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const [, monthName, day, year] = match;

    // Mapuj nazwę miesiąca na numer (angielskie nazwy)
    const monthMap: Record<string, string> = {
      January: '01',
      February: '02',
      March: '03',
      April: '04',
      May: '05',
      June: '06',
      July: '07',
      August: '08',
      September: '09',
      October: '10',
      November: '11',
      December: '12',
    };

    const monthNum = monthMap[monthName];
    if (!monthNum) {
      return null;
    }

    const dayPadded = day.padStart(2, '0');
    return `${year}-${monthNum}-${dayPadded}`;
  } catch {
    return null;
  }
};

/**
 * Parsuje waluty z sekcji Cash Report
 *
 * W sekcji Cash Report każda waluta ma wiersz z "Starting Cash" lub podobnym
 * Format: Cash Report,Data,Starting Cash,USD,0,0,0
 *         Cash Report,Data,Starting Cash,PLN,0,0,0
 *
 * Waluty są w kolumnie "Currency", pomijamy "Base Currency Summary"
 */
export const parseCashReportCurrencies = (
  cashReportSection: CsvSection | undefined
): Set<string> => {
  const currencies = new Set<string>();

  if (!cashReportSection) {
    return currencies;
  }

  // Znajdź wszystkie wiersze z walutami (pomijamy "Base Currency Summary")
  for (const rowData of cashReportSection.rows) {
    const dataMap = createDataMap(cashReportSection.headers, rowData);
    const currency = getValue(dataMap, CashReportColumnNames.CURRENCY);

    // Pomijamy "Base Currency Summary" i puste wartości
    // Waluta powinna być 3-literowym kodem (USD, PLN, EUR, itp.)
    if (currency && currency !== 'Base Currency Summary' && currency.trim() !== '') {
      const cleanCurrency = currency.trim().toUpperCase();
      // Walidacja: tylko 3-literowe kody walut
      if (/^[A-Z]{3}$/.test(cleanCurrency)) {
        currencies.add(cleanCurrency);
      }
    }
  }

  return currencies;
};

/**
 * Parsuje metadane z CSV (zakres dat i waluty)
 */
export const parseStatementMetadata = (
  statementSection: CsvSection | undefined,
  cashReportSection: CsvSection | undefined
): IBKRStatementMetadata => {
  const { minDate, maxDate } = parseStatementPeriod(statementSection);
  const currencies = parseCashReportCurrencies(cashReportSection);

  return {
    minDate,
    maxDate,
    currencies,
  };
};
