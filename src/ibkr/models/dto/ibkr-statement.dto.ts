import { IBKRAccountInformationDto } from './ibkr-account-information.dto';
import { IBKRStatementMetadata } from './ibkr-statement-metadata.dto';
import { IBKRNetAssetValueDto } from './ibkr-net-asset-value.dto';
import { IBKRInterestDto } from './ibkr-interest.dto';
import { IBKRDividendDto } from './ibkr-dividend.dto';
import { IBKRDepositDto } from './ibkr-deposit.dto';
import { IBKRBorrowDto } from './ibkr-borrow.dto';
import { IBKRTradeDto } from './ibkr-trade.dto';

/**
 * Statement IBKR (surowe dane z CSV)
 * Zawiera wszystkie dane wyciągnięte z parsowania CSV bez wzbogacenia
 */
export interface IBKRStatement {
  deposits: IBKRDepositDto[];
  trades: IBKRTradeDto[];
  interests: IBKRInterestDto[];
  dividends: IBKRDividendDto[];
  borrows: IBKRBorrowDto[];
  metadata: IBKRStatementMetadata;
  accountInformation: IBKRAccountInformationDto;
  netAssetValue: IBKRNetAssetValueDto;
}
