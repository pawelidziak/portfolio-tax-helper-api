import { LambdaIntegration, Resource, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

import { ApiEndpointConfig } from '../models';

export interface ApiRouterFactoryResult {
  addEndpoints: (endpoints: ApiEndpointConfig[], lambda: IFunction) => void;
}

/**
 * Factory function to create API router with endpoint management
 *
 * Returns a function to add endpoints to API Gateway with resource caching.
 * This approach is more functional and consistent with other factory functions.
 */
export function apiRouterFactory(api: RestApi): ApiRouterFactoryResult {
  const cache = new Map<string, Resource>();

  /**
   * Gets or creates a resource for the given path
   */
  const getResource = (path: string): Resource => {
    if (cache.has(path)) return cache.get(path)!;

    const parts = path.replace(/^\//, '').split('/');
    let resource: Resource = api.root as Resource;

    for (const part of parts) {
      const existing = resource.getResource(part);
      resource = existing ? (existing as Resource) : resource.addResource(part);
    }

    cache.set(path, resource);
    return resource;
  };

  /**
   * Adds endpoints to API Gateway
   */
  return {
    addEndpoints: (endpoints: ApiEndpointConfig[], lambda: IFunction): void => {
      for (const endpoint of endpoints) {
        const resource = getResource(endpoint.path);
        resource.addMethod(
          endpoint.method,
          new LambdaIntegration(lambda),
          endpoint.requiresApiKey ? { apiKeyRequired: true } : undefined
        );
      }
    },
  };
}
