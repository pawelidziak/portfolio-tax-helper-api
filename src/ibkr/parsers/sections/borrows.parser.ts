/**
 * Parser for the Borrow Fee Details section
 *
 * Responsibilities:
 * - Converting CsvSection to IBKRBorrowDto[]
 * - Column mapping
 * - Keeping only Data rows (skipping Total from the CSV)
 */

import { createDataMap, removeQuotes, parseNumber, getValue } from '@utils';
import { CsvSection } from '@shared/models';

import { IBKRBorrowDto } from '../../models/dto';

/**
 * Column names in the Borrow Fee Details section of the IBKR CSV file
 */
enum CsvColumnNames {
  VALUE_DATE = 'Value Date',
  FEE_RATE = 'Fee Rate (%)',
  BORROW_FEE = 'Borrow Fee',
  CURRENCY = 'Currency',
  QUANTITY = 'Quantity',
  SYMBOL = 'Symbol',
  PRICE = 'Price',
  VALUE = 'Value',
  CODE = 'Code',
}

/**
 * Parses the Borrow Fee Details section into IBKRBorrowDto[]
 */
export const parseBorrowsSection = (section: CsvSection): IBKRBorrowDto[] => {
  const borrows: IBKRBorrowDto[] = [];

  for (const rowData of section.rows) {
    const borrow = parseBorrowRow(section.headers, rowData);
    if (borrow) borrows.push(borrow);
  }

  return borrows;
};

/**
 * Parses a single row into IBKRBorrowDto
 * (skipping Total from the CSV)
 */
const parseBorrowRow = (headers: string[], rowData: string[]): IBKRBorrowDto | null => {
  const dataMap = createDataMap(headers, rowData);

  // Check that this is not Total - Total may have "Total" in the Currency column or an empty currency
  const currency = getValue(dataMap, CsvColumnNames.CURRENCY);
  const currencyTrimmed = currency ? currency.trim() : '';
  if (!currencyTrimmed || currencyTrimmed.toLowerCase() === 'total') {
    return null; // Skip Total rows
  }

  const borrowFee = parseNumber(getValue(dataMap, CsvColumnNames.BORROW_FEE));
  if (borrowFee === null || borrowFee === undefined) return null;

  // Date validation - without a date we cannot find the NBP rate
  const valueDate = getValue(dataMap, CsvColumnNames.VALUE_DATE);
  if (!valueDate || valueDate.trim() === '') {
    return null; // Skip entries without a date
  }

  return {
    currency: removeQuotes(currencyTrimmed),
    valueDate: valueDate.trim(),
    symbol: removeQuotes(getValue(dataMap, CsvColumnNames.SYMBOL) || ''),
    quantity: parseNumber(getValue(dataMap, CsvColumnNames.QUANTITY)) || 0,
    price: parseNumber(getValue(dataMap, CsvColumnNames.PRICE)) || 0,
    value: parseNumber(getValue(dataMap, CsvColumnNames.VALUE)) || 0,
    feeRate: parseNumber(getValue(dataMap, CsvColumnNames.FEE_RATE)) || 0,
    borrowFee,
    code: getValue(dataMap, CsvColumnNames.CODE) || '',
  };
};
