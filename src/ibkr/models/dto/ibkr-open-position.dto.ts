import { CurrencyEnum } from '@shared/models';

/**
 * DTO dla pojedynczej otwartej pozycji z CSV IBKR
 */
export interface IBKROpenPositionDto {
  dataDiscriminator: string; // "Summary" dla pozycji, "Total" dla podsumowania
  assetCategory: string; // "Stocks", "Equity and Index Options", etc.
  currency: CurrencyEnum;
  symbol: string;
  quantity: number; // Może być ujemne dla short positions
  mult: number; // Multiplier (np. 100 dla opcji)
  costPrice: number; // Średnia cena zakupu
  costBasis: number; // Całkowity koszt (quantity * costPrice * mult)
  closePrice: number; // Aktualna cena zamknięcia
  value: number; // Aktualna wartość pozycji (quantity * closePrice * mult)
  unrealizedPL: number; // Niezrealizowany zysk/strata (value - costBasis)
  code: string; // Kody transakcji
}
