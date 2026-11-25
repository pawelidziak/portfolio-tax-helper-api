/**
 * Parser for the Open Positions section
 *
 * Responsibilities:
 * - Converting CsvSection to IBKROpenPositionDto[]
 * - Column mapping
 * - Keeping only Summary rows (skipping Total from the CSV)
 */

import { createDataMap, removeQuotes, parseNumber, getValue } from '@utils';
import { CurrencyEnum, CsvSection } from '@shared/models';

import { IBKROpenPositionDto } from '../../models/dto';

/**
 * Column names in the Open Positions section of the IBKR CSV file
 */
enum CsvColumnNames {
  DATA_DISCRIMINATOR = 'DataDiscriminator',
  ASSET_CATEGORY = 'Asset Category',
  UNREALIZED_PL = 'Unrealized P/L',
  CLOSE_PRICE = 'Close Price',
  COST_PRICE = 'Cost Price',
  COST_BASIS = 'Cost Basis',
  CURRENCY = 'Currency',
  QUANTITY = 'Quantity',
  SYMBOL = 'Symbol',
  VALUE = 'Value',
  MULT = 'Mult',
  CODE = 'Code',
}

enum DataDiscriminatorEnum {
  SUMMARY = 'Summary',
  TOTAL = 'Total',
}

/**
 * Parses the Open Positions section into IBKROpenPositionDto[]
 */
export const parseOpenPositionsSection = (section: CsvSection): IBKROpenPositionDto[] => {
  const positions: IBKROpenPositionDto[] = [];

  for (const rowData of section.rows) {
    const position = parseOpenPositionRow(section.headers, rowData);
    if (position) positions.push(position);
  }

  return positions;
};

/**
 * Parses a single row into IBKROpenPositionDto
 * (Summary only, skipping Total)
 */
const parseOpenPositionRow = (headers: string[], rowData: string[]): IBKROpenPositionDto | null => {
  const dataMap = createDataMap(headers, rowData);

  const discriminator = dataMap.get(CsvColumnNames.DATA_DISCRIMINATOR)?.trim();
  if (discriminator !== DataDiscriminatorEnum.SUMMARY) return null;

  return {
    dataDiscriminator: DataDiscriminatorEnum.SUMMARY,
    assetCategory: removeQuotes(getValue(dataMap, CsvColumnNames.ASSET_CATEGORY)),
    currency: removeQuotes(getValue(dataMap, CsvColumnNames.CURRENCY)) as CurrencyEnum,
    symbol: removeQuotes(getValue(dataMap, CsvColumnNames.SYMBOL)),
    quantity: parseNumber(getValue(dataMap, CsvColumnNames.QUANTITY)) || 0,
    mult: parseNumber(getValue(dataMap, CsvColumnNames.MULT)) || 1,
    costPrice: parseNumber(getValue(dataMap, CsvColumnNames.COST_PRICE)) || 0,
    costBasis: parseNumber(getValue(dataMap, CsvColumnNames.COST_BASIS)) || 0,
    closePrice: parseNumber(getValue(dataMap, CsvColumnNames.CLOSE_PRICE)) || 0,
    value: parseNumber(getValue(dataMap, CsvColumnNames.VALUE)) || 0,
    unrealizedPL: parseNumber(getValue(dataMap, CsvColumnNames.UNREALIZED_PL)) || 0,
    code: getValue(dataMap, CsvColumnNames.CODE) || '',
  };
};
