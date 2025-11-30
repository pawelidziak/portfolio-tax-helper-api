/**
 * Kategorie transakcji (model domenowy)
 *
 * Używane do określenia typu operacji niezależnie od brokera.
 * Każdy broker może mieć swoje własne nazwy kategorii w źródle danych,
 * ale mapujemy je na ten wspólny enum.
 *
 * ⚠️ ROZSZERZANIE:
 * - Gdy dodajesz nowego brokera z nowymi kategoriami, rozważ dodanie ich tutaj
 * - Jeśli kategoria jest specyficzna tylko dla jednego brokera, użyj UNKNOWN
 *   i obsłuż ją w logice specyficznej dla tego brokera
 * - Przykłady przyszłych kategorii: FUTURES, BONDS, CRYPTO, etc.
 */
export enum OperationCategoryEnum {
  DIVIDEND = 'DIVIDEND',
  INTEREST = 'INTEREST',
  DEPOSIT = 'DEPOSIT',
  UNKNOWN = 'UNKNOWN',
  OPTIONS = 'OPTIONS',
  BORROW = 'BORROW',
  STOCKS = 'STOCKS',
  FOREX = 'FOREX',
}
