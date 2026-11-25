import { OperationCategoryEnum } from '../enums';

/**
 * Deposit/withdrawal (domain model)
 *
 * Abstraction independent of the data source
 */
export interface Deposit {
  /** Operation category */
  category: OperationCategoryEnum;

  /** Deposit/withdrawal currency */
  currency: string;

  /** Settlement date in YYYY-MM-DD format */
  settleDate: string;

  /** Transaction description */
  description: string;

  /**
   * Deposit/withdrawal amount
   * Positive values are deposits, negative values are withdrawals.
   */
  amount: number;
}
