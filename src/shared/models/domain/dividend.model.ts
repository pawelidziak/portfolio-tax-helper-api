import { ExchangeRate } from './exchange-rate.model';
import { TaxSummary } from './tax-summary.model';

/**
 * Dywidenda (model domenowy)
 *
 * Abstrakcja niezależna od źródła danych (IBKR, inny broker, etc.)
 * Zawiera kurs wymiany i podsumowanie podatkowe dodane przez mapper.
 */
export interface Dividend {
  /** Symbol instrumentu (ticker) */
  symbol: string;

  /** Data dywidendy (Format: "YYYY-MM-DD") */
  date: string;

  /** Waluta dywidendy */
  currency: string;

  /** Kwota brutto dywidendy (przed podatkiem u źródła) */
  grossAmount: number;

  /** Podatek u źródła (zawsze ujemny lub 0) */
  withholdingTaxAmount: number;

  /** Kwota netto dywidendy (po podatku u źródła) */
  netAmount: number;

  /** Kurs wymiany (dodane przez mapper) */
  exchangeRate: ExchangeRate;

  /** Podsumowanie podatkowe (dodane przez mapper) */
  summary: TaxSummary;
}
