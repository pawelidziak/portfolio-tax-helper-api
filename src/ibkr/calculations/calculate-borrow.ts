import { TaxSummary } from '@shared/models';
import { IBKRBorrowDto } from '@ibkr';

export function calculateBorrowResult(borrow: IBKRBorrowDto, fxRateToPLN: number): TaxSummary {
  const borrowFeeAbs = Math.abs(borrow.borrowFee ?? 0); // USD

  const revenue = 0;
  const cost = borrowFeeAbs * fxRateToPLN;
  const income = revenue - cost; // ujemny

  return { revenue, cost, income };
}
