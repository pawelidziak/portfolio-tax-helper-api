/**
 * Parser dla sekcji Borrow Fee Details
 *
 * Odpowiedzialność:
 * - Konwersja CsvSection na IBKRBorrowDto[]
 * - Mapowanie kolumn
 * - Filtrowanie tylko Data (pomijamy Total z CSV)
 */

import { createDataMap, removeQuotes, parseNumber, getValue } from '@utils';
import { CsvSection } from '@shared/models';

import { IBKRBorrowDto } from '../../models/dto';

/**
 * Nazwy kolumn w sekcji Borrow Fee Details pliku CSV IBKR
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
 * Parsuje sekcję Borrow Fee Details na IBKRBorrowDto[]
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
 * Parsuje pojedynczy wiersz na IBKRBorrowDto
 * (pomijamy Total z CSV)
 */
const parseBorrowRow = (headers: string[], rowData: string[]): IBKRBorrowDto | null => {
  const dataMap = createDataMap(headers, rowData);

  // Sprawdź czy to nie Total - Total może mieć "Total" w kolumnie Currency lub pustą walutę
  const currency = getValue(dataMap, CsvColumnNames.CURRENCY);
  const currencyTrimmed = currency ? currency.trim() : '';
  if (!currencyTrimmed || currencyTrimmed.toLowerCase() === 'total') {
    return null; // Pomijamy wiersze Total
  }

  const borrowFee = parseNumber(getValue(dataMap, CsvColumnNames.BORROW_FEE));
  if (borrowFee === null || borrowFee === undefined) return null;

  // Walidacja daty - bez daty nie możemy znaleźć kursu NBP
  const valueDate = getValue(dataMap, CsvColumnNames.VALUE_DATE);
  if (!valueDate || valueDate.trim() === '') {
    return null; // Pomijamy wpisy bez daty
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
