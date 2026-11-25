/**
 * DTO for a single Net Asset Value row from the IBKR CSV
 */
export interface IBKRNetAssetValueItemDto {
  assetClass: string;
  priorTotal: number;
  currentLong: number;
  currentShort: number;
  currentTotal: number;
  change: number;
}

/**
 * DTO for the Net Asset Value section from the IBKR CSV
 */
export interface IBKRNetAssetValueDto {
  items: IBKRNetAssetValueItemDto[];
  timeWeightedRateOfReturn?: string; // e.g. "-4.729667797%"
}
