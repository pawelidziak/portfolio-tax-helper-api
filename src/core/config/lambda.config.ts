import { HttpMethod } from 'aws-cdk-lib/aws-events';
import { LambdaFunctionConfig } from '../models';

/**
 * Configuration for all Lambda functions in the project.
 * NOTE. To add a new function, just add an entry to this array
 */
export const LAMBDA_FUNCTIONS: LambdaFunctionConfig[] = [
  {
    name: 'IbkrCsvParser',
    entry: 'ibkr-csv-parser/index.ts',
    description: 'IBKR CSV parser',
    endpoints: [{ path: '/ibkr-csv-parser', method: HttpMethod.POST, requiresApiKey: true }],
  },
];
