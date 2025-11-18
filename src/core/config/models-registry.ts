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
  AssetCategoryEnum,
  CurrencyEnum,
  IBKRTradeDto,
  NBPRateDto,
  Trade,
  TradeSummary,
  ExchangeRate,
  IBKRStatement,
} from '@models';

export const ModelRegistry = {
  // Enums
  AssetCategoryEnum: {} as AssetCategoryEnum,
  CurrencyEnum: {} as CurrencyEnum,

  // DTOs
  IBKRTradeDto: {} as IBKRTradeDto,
  NBPRateDto: {} as NBPRateDto,

  // Models
  IBKRStatement: {} as IBKRStatement,
  ExchangeRate: {} as ExchangeRate,
  TradeSummary: {} as TradeSummary,
  Trade: {} as Trade,
};
