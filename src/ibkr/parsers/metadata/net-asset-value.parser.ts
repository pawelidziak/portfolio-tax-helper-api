/**
 * Parser for the Net Asset Value section
 *
 * Responsibilities:
 * - Converting CsvSection to IBKRNetAssetValueDto
 * - Mapping rows with asset classes
 * - Handling Time Weighted Rate of Return (separate header)
 */

import { createDataMap, removeQuotes, parseNumber, getValue } from '@utils';
import { CsvSection } from '@shared/models';

import { IBKRNetAssetValueItemDto, IBKRNetAssetValueDto } from '../../models/dto';

/**
 * Column names in the Net Asset Value section
 */
enum CsvColumnNames {
  CURRENT_SHORT = 'Current Short',
  CURRENT_TOTAL = 'Current Total',
  CURRENT_LONG = 'Current Long',
  ASSET_CLASS = 'Asset Class',
  PRIOR_TOTAL = 'Prior Total',
  CHANGE = 'Change',
}

/**
 * Parses the Net Asset Value section into IBKRNetAssetValueDto
 */
export const parseNetAssetValueSection = (
  section: CsvSection | undefined
): IBKRNetAssetValueDto => {
  const items: IBKRNetAssetValueItemDto[] = [];
  let timeWeightedRateOfReturn: undefined | string;

  if (!section) {
    return { items, timeWeightedRateOfReturn };
  }

  // Net Asset Value can have multiple headers:
  // 1. Asset Class, Prior Total, Current Long, Current Short, Current Total, Change
  // 2. Time Weighted Rate of Return (only one column)
  //
  // Note: the CSV parser merges rows with different headers, so we need to check
  // whether the header contains "Time Weighted Rate of Return" or the row length

  // Check whether the section has a "Time Weighted Rate of Return" header
  const hasTimeWeightedHeader =
    section.headers.length === 1 && section.headers[0] === 'Time Weighted Rate of Return';

  for (const rowData of section.rows) {
    // Check whether this is a Time Weighted Rate of Return row
    // (only one column OR the header is "Time Weighted Rate of Return")
    if (
      hasTimeWeightedHeader ||
      (rowData.length === 1 &&
        !getValue(createDataMap(section.headers, rowData), CsvColumnNames.ASSET_CLASS))
    ) {
      const value = rowData[0];
      if (value && value.trim() !== '') {
        timeWeightedRateOfReturn = removeQuotes(value).trim();
      }
      continue;
    }

    // Normal asset class row - use the section headers
    const dataMap = createDataMap(section.headers, rowData);
    const assetClass = getValue(dataMap, CsvColumnNames.ASSET_CLASS);
    if (!assetClass || assetClass.trim() === '' || assetClass.trim() === 'Total') {
      continue; // Skip Total and empty values
    }

    const priorTotal = parseNumber(getValue(dataMap, CsvColumnNames.PRIOR_TOTAL));
    const currentLong = parseNumber(getValue(dataMap, CsvColumnNames.CURRENT_LONG));
    const currentShort = parseNumber(getValue(dataMap, CsvColumnNames.CURRENT_SHORT));
    const currentTotal = parseNumber(getValue(dataMap, CsvColumnNames.CURRENT_TOTAL));
    const change = parseNumber(getValue(dataMap, CsvColumnNames.CHANGE));

    if (
      priorTotal !== undefined &&
      currentLong !== undefined &&
      currentShort !== undefined &&
      currentTotal !== undefined &&
      change !== undefined
    ) {
      items.push({
        assetClass: removeQuotes(assetClass).trim(),
        priorTotal,
        currentLong,
        currentShort,
        currentTotal,
        change,
      });
    }
  }

  return {
    items,
    timeWeightedRateOfReturn,
  };
};
