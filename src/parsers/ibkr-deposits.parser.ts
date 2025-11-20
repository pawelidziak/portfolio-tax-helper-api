/**
 * Parser dla sekcji Deposits & Withdrawals
 *
 * Odpowiedzialność:
 * - Konwersja CsvSection na IBKRDepositDto[]
 * - Mapowanie kolumn
 * - Filtrowanie tylko rekordów danych (pomijamy Total/Total in USD z CSV)
 */

import { removeQuotes, parseNumber, createDataMap, getValue } from '@utils';
import { CsvSection, IBKRDepositDto } from '@models';

/**
 * Nazwy kolumn w sekcji Deposits & Withdrawals pliku CSV IBKR
 */
enum CsvColumnNames {
  CURRENCY = 'Currency',
  SETTLE_DATE = 'Settle Date',
  DESCRIPTION = 'Description',
  AMOUNT = 'Amount',
}

/**
 * Parsuje sekcję Deposits & Withdrawals na IBKRDepositDto[]
 */
export const parseDepositsSection = (section: CsvSection): IBKRDepositDto[] => {
  const deposits: IBKRDepositDto[] = [];

  for (const rowData of section.rows) {
    const deposit = parseDepositRow(section.headers, rowData);
    if (deposit) deposits.push(deposit);
  }

  return deposits;
};

/**
 * Parsuje pojedynczy wiersz na IBKRDepositDto
 * (pomijamy Total/Total in USD)
 */
const parseDepositRow = (headers: string[], rowData: string[]): IBKRDepositDto | null => {
  const dataMap = createDataMap(headers, rowData);

  const currency = removeQuotes(getValue(dataMap, CsvColumnNames.CURRENCY));
  const settleDate = removeQuotes(getValue(dataMap, CsvColumnNames.SETTLE_DATE));
  const description = removeQuotes(getValue(dataMap, CsvColumnNames.DESCRIPTION));
  const amount = parseNumber(getValue(dataMap, CsvColumnNames.AMOUNT));

  // Pomijamy wiersze Total/Total in USD (nie mają currency lub settleDate)
  if (!currency || !settleDate || amount === undefined) return null;

  return {
    currency,
    settleDate,
    description,
    amount: amount,
  };
};
