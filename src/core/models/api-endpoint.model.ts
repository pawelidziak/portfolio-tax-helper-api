import { HttpMethod } from 'aws-cdk-lib/aws-events';

/**
 * API Gateway endpoint
 */
export interface ApiEndpointConfig {
  path: string; // Endpoint path (e.g. '/hello', '/users/{userId}')
  method: HttpMethod; // HTTP method
  requiresApiKey?: boolean; // Whether API Key is required
}
