import { BundlingOptions } from 'aws-cdk-lib/aws-lambda-nodejs';

import { ApiEndpointConfig } from './api-endpoint.model';

/**
 * Lambda function configuration
 */
export interface LambdaFunctionConfig {
  name: string; // Function name (used in CDK construct ID)
  entry: string; // Source file path (relative to src/lambda/)
  endpoints: ApiEndpointConfig[]; // API Gateway endpoints for this function
  environment?: Record<string, string>; // Environment variables specific to this function
  description?: string; // Function description
  bundling?: BundlingOptions; // Custom bundling options (optional)
}
