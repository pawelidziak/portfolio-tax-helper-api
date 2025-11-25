import { ExchangeRate } from './exchange-rate.model';
import { TaxSummary } from './tax-summary.model';

/**
 * Opłata za pożyczkę akcji (model domenowy)
 *
 * Abstrakcja niezależna od źródła danych (IBKR, inny broker, etc.)
 * Zawiera kurs wymiany i podsumowanie podatkowe dodane przez mapper.
 */
export interface Borrow {
  /** Symbol instrumentu */
  symbol: string;

  /** Data wartości (Value Date) - Format: "YYYY-MM-DD" */
  valueDate: string;

  /** Waluta opłaty */
  currency: string;

  /** Ilość pożyczonych akcji */
  quantity: number;

  /** Cena akcji */
  price: number;

  /** Wartość zabezpieczenia (collateral value) */
  value: number;

  /** Stawka opłaty w % rocznie */
  feeRate: number;

  /** Opłata za pożyczkę (zawsze ujemna) */
  borrowFee: number;

  /** Kod transakcji */
  code: string;

  /** Kurs wymiany (dodane przez mapper) */
  exchangeRate: ExchangeRate;

  /** Podsumowanie podatkowe (dodane przez mapper) */
  summary: TaxSummary;
}
