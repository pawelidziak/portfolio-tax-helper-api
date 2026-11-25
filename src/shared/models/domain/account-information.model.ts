/**
 * Account information (domain model)
 *
 * Abstraction independent of the data source (IBKR, another broker, etc.)
 */
export interface AccountInformation {
  name: string;
  account: string;
  accountType: string;
  customerType: string;
  accountCapabilities: string;
  baseCurrency: string;
}
