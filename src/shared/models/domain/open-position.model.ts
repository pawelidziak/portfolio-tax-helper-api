import { ExchangeRate } from './exchange-rate.model';
import { OperationCategoryEnum } from '../enums';

/**
 * Otwarta pozycja w portfelu (model domenowy)
 *
 * Reprezentuje aktualną pozycję w portfelu (nie transakcję).
 * Abstrakcja niezależna od źródła danych (IBKR, inny broker, etc.)
 * Zawiera kurs wymiany dodany przez mapper.
 */
export interface OpenPosition {
  /** Symbol instrumentu */
  symbol: string;

  /**
   * Kategoria aktywów
   *
   * Używana do identyfikacji typu pozycji.
   * Każdy broker mapuje swoje kategorie na OperationCategoryEnum w swoim mapperze.
   */
  category: OperationCategoryEnum;

  /** Waluta pozycji */
  currency: string;

  /**
   * Liczba jednostek w pozycji.
   * Wartości ujemne oznaczają pozycje short, dodatnie - long.
   */
  quantity: number;

  /** Multiplier (np. 100 dla opcji) */
  mult: number;

  /** Średnia cena zakupu */
  costPrice: number;

  /** Całkowity koszt pozycji (quantity * costPrice * mult) */
  costBasis: number;

  /** Aktualna cena zamknięcia */
  closePrice: number;

  /** Aktualna wartość pozycji (quantity * closePrice * mult) */
  value: number;

  /** Niezrealizowany zysk/strata (value - costBasis) */
  unrealizedPL: number;

  /** Kod pozycji (opcjonalny) */
  code?: string;

  /** Kurs wymiany (dodane przez mapper) */
  exchangeRate: ExchangeRate;
}
