/**
 * Parser for the Account Information section
 *
 * Responsibilities:
 * - Converting CsvSection to IBKRAccountInformationDto
 * - Mapping Field Name -> Field Value fields
 */

import { createDataMap, removeQuotes, getValue } from '@utils';
import { CsvSection } from '@shared/models';

import { IBKRAccountInformationDto } from '../../models/dto';

/**
 * Column names in the Account Information section
 */
enum CsvColumnNames {
  FIELD_VALUE = 'Field Value',
  FIELD_NAME = 'Field Name',
}

/**
 * Mapping of CSV field names to DTO properties
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
 * Parses the Account Information section into IBKRAccountInformationDto
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
 * Parses a single Account Information row
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
