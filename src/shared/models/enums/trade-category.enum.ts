/**
 * Kategorie transakcji (model domenowy)
 *
 * Używane do określenia typu transakcji niezależnie od brokera.
 * Każdy broker może mieć swoje własne nazwy kategorii w źródle danych,
 * ale mapujemy je na ten wspólny enum.
 *
 * ⚠️ ROZSZERZANIE:
 * - Gdy dodajesz nowego brokera z nowymi kategoriami, rozważ dodanie ich tutaj
 * - Jeśli kategoria jest specyficzna tylko dla jednego brokera, użyj UNKNOWN
 *   i obsłuż ją w logice specyficznej dla tego brokera
 * - Przykłady przyszłych kategorii: FUTURES, BONDS, CRYPTO, etc.
 */
export enum TradeCategoryEnum {
  /** Nieznana kategoria (używana gdy broker ma kategorię, której nie obsługujemy) */
  UNKNOWN = 'UNKNOWN',
  /** Opcje (equity options, index options, etc.) */
  OPTIONS = 'OPTIONS',
  /** Akcje i ETF */
  STOCKS = 'STOCKS',
  /** Wymiana walut (Forex) */
  FOREX = 'FOREX',
}
