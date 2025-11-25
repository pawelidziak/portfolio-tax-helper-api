/**
 * DTO dla sekcji Account Information z CSV IBKR
 */
export interface IBKRAccountInformationDto {
  name: string;
  account: string;
  accountType: string;
  customerType: string;
  accountCapabilities: string;
  baseCurrency: string;
}
