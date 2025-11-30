/**
 * Model Registry - jedyne miejsce gdzie dodajesz modele do OpenAPI
 *
 * ⚠️ Gdy dodajesz nowy model:
 * 1. Dodaj TypeScript type/enum w odpowiednim pliku
 * 2. Dodaj tutaj wpis: ModelName: {} as ModelName
 * 3. Build automatycznie wygeneruje schematy!
 *
 * typescript-json-schema używa kluczy tego obiektu jako nazw typów do generowania.
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
