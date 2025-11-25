/**
 * Informacje o koncie (model domenowy)
 *
 * Abstrakcja niezależna od źródła danych (IBKR, inny broker, etc.)
 */
export interface AccountInformation {
  name: string;
  account: string;
  accountType: string;
  customerType: string;
  accountCapabilities: string;
  baseCurrency: string;
}
