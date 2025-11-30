import { ExchangeRate } from './exchange-rate.model';
import { TradeAction } from './trade-action.model';
import { TaxSummary } from './tax-summary.model';
import { OperationCategoryEnum } from '../enums';

/**
 * Transakcja (model domenowy)
 *
 * Abstrakcja niezależna od źródła danych (IBKR, inny broker, etc.)
 * Zawiera kurs wymiany i podsumowanie podatkowe dodane przez mapper.
 *
 * ⚠️ PRZYGOTOWANIE NA PRZYSZŁOŚĆ:
 * - Model jest wspólny dla wszystkich brokerów, ale każdy broker może mieć
 *   swoje specyficzne pola w źródle danych (DTO)
 * - Jeśli w przyszłości będziesz potrzebować pól specyficznych dla kategorii
 *   (np. strike, expiry dla opcji), rozważ:
 *   1. Dodanie opcjonalnych pól tutaj (np. strike?: number)
 *   2. Lub użycie pola metadata dla danych specyficznych dla brokera/kategorii
 * - Kategoria jest używana do wyboru odpowiedniej logiki obliczeniowej
 *   w calculateTradeSummary() - każdy broker ma swój mapper z własnym mapowaniem
 */
export interface Trade {
  /** Symbol instrumentu */
  symbol: string;

  /** Data i czas wykonania transakcji (Format: "YYYY-MM-DD, HH:MM:SS") */
  dateTime: string;

  /**
   * Kategoria transakcji
   *
   * Używana do wyboru odpowiedniej logiki obliczeniowej podatkowej.
   * Każdy broker mapuje swoje kategorie na OperationCategoryEnum w swoim mapperze.
   */
  category: OperationCategoryEnum;

  /** Waluta transakcji */
  currency: string;

  /**
   * Liczba jednostek w transakcji.
   * Wartości ujemne oznaczają sprzedaż, dodatnie - zakup.
   */
  quantity: number;

  /**
   * Pozycja netto (signed) po wykonaniu tej transakcji dla danego symbolu.
   * Dodatnia wartość = long, ujemna = short, zero = brak pozycji.
   */
  quantityAfter: number;

  /** Cena transakcji */
  tradePrice: number;

  /** Cena zamknięcia instrumentu */
  closingPrice: number;

  /** Przychód z transakcji (ujemny dla zakupów, dodatni dla sprzedaży) */
  proceeds: number;

  /** Prowizja i opłaty */
  commissionFee: number;

  /** Podstawa kosztowa */
  basis: number;

  /** Zrealizowany zysk/strata */
  realizedPL: number;

  /** Mark-to-Market zysk/strata */
  mtmPL: number;

  /**
   * Kod transakcji (np. "O", "C", "A;O")
   *
   * Format i znaczenie kodów może różnić się między brokerami.
   * Każdy broker ma swój parser, który interpretuje te kody.
   */
  code?: string;

  /**
   * Dodatkowe metadane specyficzne dla brokera/kategorii
   *
   * Używane do przechowywania danych, które nie pasują do standardowych pól,
   * ale mogą być potrzebne w przyszłości (np. strike, expiry dla opcji).
   *
   * Przykład użycia:
   * - Dla opcji: { strike: 615, expiry: "2025-11-04", optionType: "PUT" }
   * - Dla innych brokerów: { brokerSpecificField: "value" }
   */
  metadata?: Record<string, unknown>;

  /** Kurs wymiany (dodane przez mapper) */
  exchangeRate: ExchangeRate;

  /** Podsumowanie podatkowe (dodane przez mapper) */
  summary: TaxSummary;

  /** Akcje na pozycjach (dodane przez mapper) */
  actions: TradeAction[];
}
