/**
 * Parser dla sekcji Net Asset Value
 *
 * Odpowiedzialność:
 * - Konwersja CsvSection na IBKRNetAssetValueDto
 * - Mapowanie wierszy z klasami aktywów
 * - Obsługa Time Weighted Rate of Return (osobny nagłówek)
 */

import { createDataMap, removeQuotes, parseNumber, getValue } from '@utils';
import { CsvSection } from '@shared/models';

import { IBKRNetAssetValueItemDto, IBKRNetAssetValueDto } from '../../models/dto';

/**
 * Nazwy kolumn w sekcji Net Asset Value
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
 * Parsuje sekcję Net Asset Value na IBKRNetAssetValueDto
 */
export const parseNetAssetValueSection = (
  section: CsvSection | undefined
): IBKRNetAssetValueDto => {
  const items: IBKRNetAssetValueItemDto[] = [];
  let timeWeightedRateOfReturn: undefined | string;

  if (!section) {
    return { items, timeWeightedRateOfReturn };
  }

  // Net Asset Value może mieć wiele nagłówków:
  // 1. Asset Class, Prior Total, Current Long, Current Short, Current Total, Change
  // 2. Time Weighted Rate of Return (tylko jedna kolumna)
  //
  // Uwaga: parser CSV łączy wiersze z różnymi nagłówkami, więc musimy sprawdzić
  // czy nagłówek zawiera "Time Weighted Rate of Return" lub długość wiersza

  // Sprawdź czy sekcja ma nagłówek "Time Weighted Rate of Return"
  const hasTimeWeightedHeader =
    section.headers.length === 1 && section.headers[0] === 'Time Weighted Rate of Return';

  for (const rowData of section.rows) {
    // Sprawdź czy to wiersz z Time Weighted Rate of Return
    // (tylko jedna kolumna LUB nagłówek to "Time Weighted Rate of Return")
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

    // Normalny wiersz z klasą aktywów - użyj nagłówków z sekcji
    const dataMap = createDataMap(section.headers, rowData);
    const assetClass = getValue(dataMap, CsvColumnNames.ASSET_CLASS);
    if (!assetClass || assetClass.trim() === '' || assetClass.trim() === 'Total') {
      continue; // Pomijamy Total i puste wartości
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
