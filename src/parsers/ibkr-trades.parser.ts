/**
 * Parser dla sekcji Trades
 *
 * Odpowiedzialność:
 * - Konwersja CsvSection na TradeRecord[]
 * - Mapowanie kolumn (obsługa różnych nazw)
 * - Filtrowanie tylko Order (pomijamy SubTotal/Total z CSV)
 */

import { removeQuotes, parseDateTime, parseNumber, createDataMap, getValue } from '@utils';
import { CsvSection, CurrencyEnum, IBKRTradeDto } from '@models';

enum DataDiscriminatorEnum {
  ORDER = 'Order',
  SUB_TOTAL = 'SubTotal',
  TOTAL = 'Total',
}

/**
 * Nazwy kolumn w sekcji Trades pliku CSV IBKR
 */
enum CsvColumnNames {
  DATA_DISCRIMINATOR = 'DataDiscriminator',
  ASSET_CATEGORY = 'Asset Category',
  CURRENCY = 'Currency',
  SYMBOL = 'Symbol',
  DATE_TIME = 'Date/Time',
  QUANTITY = 'Quantity',
  T_PRICE = 'T. Price',
  C_PRICE = 'C. Price',
  PROCEEDS = 'Proceeds',
  COMM_FEE = 'Comm/Fee',
  COMM_IN_USD = 'Comm in USD',
  BASIS = 'Basis',
  REALIZED_PL = 'Realized P/L',
  MTM_PL = 'MTM P/L',
  MTM_IN_USD = 'MTM in USD',
  CODE = 'Code',
}

/**
 * Parsuje sekcję Trades na IBKRTradeDTO[]
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
 * Parsuje pojedynczy wiersz na IBKRTradeDto
 * (tylko Order, pomijamy SubTotal/Total)
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
