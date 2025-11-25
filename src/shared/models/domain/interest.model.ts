import { ExchangeRate } from './exchange-rate.model';
import { TaxSummary } from './tax-summary.model';

/**
 * Odsetki (model domenowy)
 *
 * Abstrakcja niezależna od źródła danych (IBKR, inny broker, etc.)
 * Zawiera kurs wymiany i podsumowanie podatkowe dodane przez mapper.
 */
export interface Interest {
  /** Data odsetek (Format: "YYYY-MM-DD") */
  date: string;

  /** Waluta odsetek */
  currency: string;

  /** Opis odsetek */
  description: string;

  /**
   * Kwota odsetek
   * Dodatnia dla credit interest (broker płaci)
   * Ujemna dla debit interest (broker pobiera - margin interest)
   */
  amount: number;

  /** Kurs wymiany (dodane przez mapper) */
  exchangeRate: ExchangeRate;

  /** Podsumowanie podatkowe (dodane przez mapper) */
  summary: TaxSummary;
}
