import { IBKRDepositDto } from './ibkr-deposit.dto';
import { IBKRTradeDto } from './ibkr-trade.dto';

export type IBKRStatement = {
  deposits: IBKRDepositDto[];
  trades: IBKRTradeDto[];
};
