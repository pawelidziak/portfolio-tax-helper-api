/**
 * Parser for the Trades section
 *
 * Responsibilities:
 * - Converting CsvSection to TradeRecord[]
 * - Column mapping (handles different names)
 * - Keeping only Order rows (skipping SubTotal/Total from the CSV)
 */

import { parseDateTime, createDataMap, removeQuotes, parseNumber, getValue } from '@utils';
import { CurrencyEnum, CsvSection } from '@shared/models';

import { IBKRTradeDto } from '../../models/dto';

/**
 * Column names in the Trades section of the IBKR CSV file
 */
enum CsvColumnNames {
  DATA_DISCRIMINATOR = 'DataDiscriminator',
  ASSET_CATEGORY = 'Asset Category',
  REALIZED_PL = 'Realized P/L',
  COMM_IN_USD = 'Comm in USD',
  MTM_IN_USD = 'MTM in USD',
  DATE_TIME = 'Date/Time',
  CURRENCY = 'Currency',
  QUANTITY = 'Quantity',
  PROCEEDS = 'Proceeds',
  COMM_FEE = 'Comm/Fee',
  T_PRICE = 'T. Price',
  C_PRICE = 'C. Price',
  MTM_PL = 'MTM P/L',
  SYMBOL = 'Symbol',
  BASIS = 'Basis',
  CODE = 'Code',
}

enum DataDiscriminatorEnum {
  SUB_TOTAL = 'SubTotal',
  ORDER = 'Order',
  TOTAL = 'Total',
}

/**
 * Parses the Trades section into IBKRTradeDTO[]
 */
export const parseTradesSection = (section: CsvSection): IBKRTradeDto[] => {
  const trades: IBKRTradeDto[] = [];

  for (const rowData of section.rows) {
    const trade = parseTradeRow(section.headers, rowData);
    if (trade) trades.push(trade);
  }

  return trades;
};

/**
 * Parses a single row into IBKRTradeDto
 * (Order only, skipping SubTotal/Total)
 */
const parseTradeRow = (headers: string[], rowData: string[]): IBKRTradeDto | null => {
  const dataMap = createDataMap(headers, rowData);

  const discriminator = dataMap.get(CsvColumnNames.DATA_DISCRIMINATOR)?.trim();
  if (discriminator !== DataDiscriminatorEnum.ORDER) return null;

  return {
    dataDiscriminator: DataDiscriminatorEnum.ORDER,
    assetCategory: removeQuotes(getValue(dataMap, CsvColumnNames.ASSET_CATEGORY)),
    currency: removeQuotes(getValue(dataMap, CsvColumnNames.CURRENCY)) as CurrencyEnum,
    symbol: removeQuotes(getValue(dataMap, CsvColumnNames.SYMBOL)),
    dateTime: parseDateTime(getValue(dataMap, CsvColumnNames.DATE_TIME)) || '',
    quantity: parseNumber(getValue(dataMap, CsvColumnNames.QUANTITY)) || 0,
    tradePrice: parseNumber(getValue(dataMap, CsvColumnNames.T_PRICE)) || 0,
    closingPrice: parseNumber(getValue(dataMap, CsvColumnNames.C_PRICE)) || 0,
    proceeds: parseNumber(getValue(dataMap, CsvColumnNames.PROCEEDS)) || 0,
    commissionFee:
      parseNumber(getValue(dataMap, CsvColumnNames.COMM_FEE, CsvColumnNames.COMM_IN_USD)) || 0,
    basis: parseNumber(getValue(dataMap, CsvColumnNames.BASIS)) || 0,
    realizedPL: parseNumber(getValue(dataMap, CsvColumnNames.REALIZED_PL)) || 0,
    mtmPL: parseNumber(getValue(dataMap, CsvColumnNames.MTM_PL, CsvColumnNames.MTM_IN_USD)) || 0,
    code: getValue(dataMap, CsvColumnNames.CODE) || '',
  };
};
