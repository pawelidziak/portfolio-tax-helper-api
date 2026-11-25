import { IBKRAccountInformationDto } from './ibkr-account-information.dto';
import { IBKRStatementMetadata } from './ibkr-statement-metadata.dto';
import { IBKRNetAssetValueDto } from './ibkr-net-asset-value.dto';
import { IBKROpenPositionDto } from './ibkr-open-position.dto';
import { IBKRInterestDto } from './ibkr-interest.dto';
import { IBKRDividendDto } from './ibkr-dividend.dto';
import { IBKRDepositDto } from './ibkr-deposit.dto';
import { IBKRBorrowDto } from './ibkr-borrow.dto';
import { IBKRTradeDto } from './ibkr-trade.dto';

/**
 * IBKR statement (raw CSV data)
 * Contains all data extracted from CSV parsing, without enrichment
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
  openPositions: IBKROpenPositionDto[];
}
