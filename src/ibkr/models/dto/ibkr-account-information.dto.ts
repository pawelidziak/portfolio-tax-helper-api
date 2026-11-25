/**
 * DTO for the Account Information section from the IBKR CSV
 */
export interface IBKRAccountInformationDto {
  name: string;
  account: string;
  accountType: string;
  customerType: string;
  accountCapabilities: string;
  baseCurrency: string;
}
