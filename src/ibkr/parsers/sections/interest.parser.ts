/**
 * Parser for the Interest section
 *
 * Responsibilities:
 * - Converting CsvSection to IBKRInterestDto[]
 * - Column mapping
 * - Keeping only Data rows (skipping Total from the CSV)
 *
 * === SUPPORTED ENTRIES ===
 * - Credit Interest (interest on free cash - IBKR pays) - amount > 0
 * - Debit Interest (interest on margin/loan - IBKR charges) - amount < 0
 *
 * === NOTE ===
 * "Borrow Fee" is in a separate "Borrow Fee Details" section and requires a separate parser.
 * Borrow Fee should be treated as a cost (negative interest).
 */

import { createDataMap, removeQuotes, parseNumber, getValue } from '@utils';
import { CsvSection } from '@shared/models';

import { IBKRInterestDto } from '../../models/dto';

/**
 * Column names in the Interest section of the IBKR CSV file
 */
enum CsvColumnNames {
  DESCRIPTION = 'Description',
  CURRENCY = 'Currency',
  AMOUNT = 'Amount',
  DATE = 'Date',
}

/**
 * Parses the Interest section into IBKRInterestDto[]
 */
export const parseInterestSection = (section: CsvSection): IBKRInterestDto[] => {
  const interests: IBKRInterestDto[] = [];

  for (const rowData of section.rows) {
    const interest = parseInterestRow(section.headers, rowData);
    if (interest) interests.push(interest);
  }

  return interests;
};

/**
 * Parses a single row into IBKRInterestDto
 * (skipping Total from the CSV)
 */
const parseInterestRow = (headers: string[], rowData: string[]): IBKRInterestDto | null => {
  const dataMap = createDataMap(headers, rowData);

  // Check that this is not Total - Total may have "Total" in the Currency column or an empty currency
  const currency = getValue(dataMap, CsvColumnNames.CURRENCY);
  const currencyTrimmed = currency ? currency.trim() : '';
  if (!currencyTrimmed || currencyTrimmed.toLowerCase() === 'total') {
    return null; // Skip Total rows
  }

  const amount = parseNumber(getValue(dataMap, CsvColumnNames.AMOUNT));
  if (amount === null || amount === undefined) return null;

  // Date validation - without a date we cannot find the NBP rate
  const date = getValue(dataMap, CsvColumnNames.DATE);
  if (!date || date.trim() === '') {
    return null; // Skip entries without a date
  }

  return {
    currency: removeQuotes(currencyTrimmed),
    date: date.trim(),
    description: removeQuotes(getValue(dataMap, CsvColumnNames.DESCRIPTION) || ''),
    amount,
  };
};
