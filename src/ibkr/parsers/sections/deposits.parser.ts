/**
 * Parser for the Deposits & Withdrawals section
 *
 * Responsibilities:
 * - Converting CsvSection to IBKRDepositDto[]
 * - Column mapping
 * - Keeping only data records (skipping Total/Total in USD from the CSV)
 */

import { createDataMap, removeQuotes, parseNumber, getValue } from '@utils';
import { CsvSection } from '@shared/models';

import { IBKRDepositDto } from '../../models/dto';

/**
 * Column names in the Deposits & Withdrawals section of the IBKR CSV file
 */
enum CsvColumnNames {
  SETTLE_DATE = 'Settle Date',
  DESCRIPTION = 'Description',
  CURRENCY = 'Currency',
  AMOUNT = 'Amount',
}

/**
 * Parses the Deposits & Withdrawals section into IBKRDepositDto[]
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
 * Parses a single row into IBKRDepositDto
 * (skipping Total/Total in USD)
 */
const parseDepositRow = (headers: string[], rowData: string[]): IBKRDepositDto | null => {
  const dataMap = createDataMap(headers, rowData);

  const currency = removeQuotes(getValue(dataMap, CsvColumnNames.CURRENCY));
  const settleDate = removeQuotes(getValue(dataMap, CsvColumnNames.SETTLE_DATE));
  const description = removeQuotes(getValue(dataMap, CsvColumnNames.DESCRIPTION));
  const amount = parseNumber(getValue(dataMap, CsvColumnNames.AMOUNT));

  // Skip Total/Total in USD rows (they have no currency or settleDate)
  if (!currency || !settleDate || amount === undefined) return null;

  return {
    currency,
    settleDate,
    description,
    amount: amount,
  };
};
