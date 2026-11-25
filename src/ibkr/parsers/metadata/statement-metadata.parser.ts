/**
 * Parser for metadata from the Statement and Cash Report sections
 *
 * Responsibilities:
 * - Extracting the date range from the Statement section
 * - Extracting currencies from the Cash Report section
 */

import { createDataMap, getValue } from '@utils';
import { CsvSection } from '@shared/models';

import { IBKRStatementMetadata } from '../../models/dto';

/**
 * Column names in the Cash Report section
 */
enum CashReportColumnNames {
  CURRENCY_SUMMARY = 'Currency Summary',
  CURRENCY = 'Currency',
}

/**
 * Column names in the Statement section
 */
enum StatementColumnNames {
  FIELD_VALUE = 'Field Value',
  FIELD_NAME = 'Field Name',
}

/**
 * Parses the date range from the Statement section
 *
 * Format: "January 1, 2025 - November 21, 2025"
 * Returns: { minDate: "2025-01-01", maxDate: "2025-11-21" }
 */
export const parseStatementPeriod = (
  statementSection: CsvSection | undefined
): { minDate: string; maxDate: string } => {
  if (!statementSection) {
    return { minDate: '', maxDate: '' };
  }

  // Find the row with Period
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
 * Parses a period string into dates (Pure Function)
 *
 * Format: "January 1, 2025 - November 21, 2025"
 * Returns: { minDate: "2025-01-01", maxDate: "2025-11-21" }
 */
const parsePeriodString = (period: string): { minDate: string; maxDate: string } => {
  // Remove quotes if present
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
 * Parses a date from the format "January 1, 2025" to "2025-01-01" (Pure Function)
 *
 * Uses a more reliable parsing method that does not depend on the locale.
 * IBKR format: "Month Day, Year" (e.g. "January 1, 2025")
 */
const parseDateString = (dateStr: string): string | null => {
  try {
    // Remove quotes if present
    const cleanDate = dateStr.replace(/^"|"$/g, '').trim();

    // Format: "January 1, 2025" or "November 21, 2025"
    // Regex: (Month) (Day), (Year)
    const match = cleanDate.match(/^(\w+)\s+(\d+),\s+(\d+)$/);
    if (!match) {
      // Fall back to standard parsing
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

    // Map the month name to a number (English names)
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
 * Parses currencies from the Cash Report section
 *
 * In the Cash Report section each currency has a row with "Starting Cash" or similar
 * Format: Cash Report,Data,Starting Cash,USD,0,0,0
 *         Cash Report,Data,Starting Cash,PLN,0,0,0
 *
 * Currencies are in the "Currency" column, "Base Currency Summary" is skipped
 */
export const parseCashReportCurrencies = (
  cashReportSection: CsvSection | undefined
): Set<string> => {
  const currencies = new Set<string>();

  if (!cashReportSection) {
    return currencies;
  }

  // Find all rows with currencies (skipping "Base Currency Summary")
  for (const rowData of cashReportSection.rows) {
    const dataMap = createDataMap(cashReportSection.headers, rowData);
    const currency = getValue(dataMap, CashReportColumnNames.CURRENCY);

    // Skip "Base Currency Summary" and empty values
    // A currency should be a 3-letter code (USD, PLN, EUR, etc.)
    if (currency && currency !== 'Base Currency Summary' && currency.trim() !== '') {
      const cleanCurrency = currency.trim().toUpperCase();
      // Validation: only 3-letter currency codes
      if (/^[A-Z]{3}$/.test(cleanCurrency)) {
        currencies.add(cleanCurrency);
      }
    }
  }

  return currencies;
};

/**
 * Parses metadata from the CSV (date range and currencies)
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
