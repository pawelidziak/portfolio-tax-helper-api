/**
 * Parser dla sekcji Account Information
 *
 * Odpowiedzialność:
 * - Konwersja CsvSection na IBKRAccountInformationDto
 * - Mapowanie pól Field Name -> Field Value
 */

import { createDataMap, removeQuotes, getValue } from '@utils';
import { CsvSection } from '@shared/models';

import { IBKRAccountInformationDto } from '../../models/dto';

/**
 * Nazwy kolumn w sekcji Account Information
 */
enum CsvColumnNames {
  FIELD_VALUE = 'Field Value',
  FIELD_NAME = 'Field Name',
}

/**
 * Mapowanie nazw pól CSV na właściwości DTO
 */
const fieldNameToProperty: Record<string, keyof IBKRAccountInformationDto> = {
  Name: 'name',
  Account: 'account',
  'Account Type': 'accountType',
  'Customer Type': 'customerType',
  'Account Capabilities': 'accountCapabilities',
  'Base Currency': 'baseCurrency',
};

/**
 * Parsuje sekcję Account Information na IBKRAccountInformationDto
 */
export const parseAccountInformationSection = (
  section: CsvSection | undefined
): IBKRAccountInformationDto => {
  const accountInfo: IBKRAccountInformationDto = {
    name: '',
    account: '',
    accountType: '',
    customerType: '',
    accountCapabilities: '',
    baseCurrency: '',
  };

  if (!section) {
    return accountInfo;
  }

  for (const rowData of section.rows) {
    const field = parseAccountInformationRow(section.headers, rowData);
    if (field) {
      const property = fieldNameToProperty[field.name];
      if (property) {
        accountInfo[property] = field.value;
      }
    }
  }

  return accountInfo;
};

/**
 * Parsuje pojedynczy wiersz Account Information
 */
const parseAccountInformationRow = (
  headers: string[],
  rowData: string[]
): { value: string; name: string } | null => {
  const dataMap = createDataMap(headers, rowData);
  const fieldName = getValue(dataMap, CsvColumnNames.FIELD_NAME);
  const fieldValue = getValue(dataMap, CsvColumnNames.FIELD_VALUE);

  if (!fieldName || !fieldValue) return null;

  return {
    name: removeQuotes(fieldName).trim(),
    value: removeQuotes(fieldValue).trim(),
  };
};
