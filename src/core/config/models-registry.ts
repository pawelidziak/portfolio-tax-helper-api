/**
 * Model Registry - the only place where you add models to OpenAPI
 *
 * ⚠️ When adding a new model:
 * 1. Add the TypeScript type/enum in the appropriate file
 * 2. Add an entry here: ModelName: {} as ModelName
 * 3. The build generates the schemas automatically!
 *
 * typescript-json-schema uses the keys of this object as type names for generation.
 */

import {
  OperationCategoryEnum,
  StatementResponseDto,
  AccountInformation,
  NBPRateResponseDto,
  StatementMetadata,
  PeriodTaxSummary,
  NetAssetValue,
  OperationItem,
  CurrencyEnum,
  ExchangeRate,
  OpenPosition,
  TradeAction,
  TaxSummary,
  Interest,
  Dividend,
  Deposit,
  Borrow,
  Trade,
} from '@shared/models';

export const ModelRegistry = {
  // Enums
  OperationCategoryEnum: {} as OperationCategoryEnum,
  CurrencyEnum: {} as CurrencyEnum,

  // DTOs
  StatementResponseDto: {} as StatementResponseDto,
  NBPRateResponseDto: {} as NBPRateResponseDto,

  // Domain Models
  AccountInformation: {} as AccountInformation,
  StatementMetadata: {} as StatementMetadata,
  PeriodTaxSummary: {} as PeriodTaxSummary,
  NetAssetValue: {} as NetAssetValue,
  OperationItem: {} as OperationItem,
  ExchangeRate: {} as ExchangeRate,
  OpenPosition: {} as OpenPosition,
  TradeAction: {} as TradeAction,
  TaxSummary: {} as TaxSummary,
  Dividend: {} as Dividend,
  Interest: {} as Interest,
  Deposit: {} as Deposit,
  Borrow: {} as Borrow,
  Trade: {} as Trade,
};
