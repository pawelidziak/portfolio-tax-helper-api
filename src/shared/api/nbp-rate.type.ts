/**
 * Typ odpowiedzi z API NBP
 * Represents the data structure received from the external NBP API
 */
export interface NBPRateResponse {
  table: string;
  currency: string;
  code: string;
  rates: {
    effectiveDate: string;
    mid: number;
    no: string;
  }[];
}
