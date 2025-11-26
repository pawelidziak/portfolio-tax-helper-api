import {
  AccountInformation,
  StatementMetadata,
  NetAssetValue,
  OpenPosition,
  Interest,
  Dividend,
  Deposit,
  Borrow,
  Trade,
} from '../domain';

/**
 * Statement Response DTO - odpowiedź API
 *
 * To jest DTO zwracane przez endpoint API.
 * Zawiera dane wzbogacone o kursy wymiany i podsumowania podatkowe.
 *
 * Używa modeli domenowych, które są niezależne od źródła danych (IBKR, inny broker, etc.)
 */
export interface StatementResponseDto {
  accountInformation: AccountInformation;
  openPositions: OpenPosition[];
  netAssetValue: NetAssetValue;
  metadata: StatementMetadata;
  interests: Interest[];
  dividends: Dividend[];
  generateDate: string;
  deposits: Deposit[];
  borrows: Borrow[];
  trades: Trade[];
}
