/**
 * DTO dla pojedynczego wiersza Net Asset Value z CSV IBKR
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
 * DTO dla sekcji Net Asset Value z CSV IBKR
 */
export interface IBKRNetAssetValueDto {
  items: IBKRNetAssetValueItemDto[];
  timeWeightedRateOfReturn?: string; // np. "-4.729667797%"
}
