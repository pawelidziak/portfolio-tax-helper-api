import { OperationCategoryEnum } from '../enums';

/**
 * Depozyt/wypłata (model domenowy)
 *
 * Abstrakcja niezależna od źródła danych
 */
export interface Deposit {
  /** Kategoria operacji */
  category: OperationCategoryEnum;

  /** Waluta depozytu/wypłaty */
  currency: string;

  /** Data rozliczenia w formacie YYYY-MM-DD */
  settleDate: string;

  /** Opis transakcji */
  description: string;

  /**
   * Kwota depozytu/wypłaty
   * Wartości dodatnie oznaczają depozyty, ujemne - wypłaty.
   */
  amount: number;
}
