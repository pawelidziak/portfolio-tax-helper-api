import { UsagePlan, RestApi, ApiKey, Period, Cors } from 'aws-cdk-lib/aws-apigateway';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface ApiGatewayFactoryProps {
  environment: string; // Environment name (dev, test, prod)
  enableApiKey?: boolean; // Whether to enable API Key protection
  apiName?: string; // Custom API name (default: LambdaApi-{environment})
  allowedOrigins?: string[]; // CORS origins (default: all origins)
}

export interface ApiGatewayFactoryResult {
  api: RestApi;
  apiKey?: ApiKey;
}

/**
 * Factory function to create API Gateway with shared configuration
 *
 * Centralizes creation of API Gateway, API Keys and Usage Plans.
 * Can easily be extended with common middleware, authorizers, etc.
 */
export function apiGatewayFactory(
  scope: Construct,
  props: ApiGatewayFactoryProps
): ApiGatewayFactoryResult {
  const stack = Stack.of(scope);
  const apiName = props.apiName || `PortfolioApi-${props.environment}`;

  // Create REST API
  const api = new RestApi(scope, 'PortfolioRestApi', {
    restApiName: apiName,
    description: `API Gateway for environment ${props.environment}`,
    deployOptions: {
      stageName: props.environment, // Use environment name as stage (dev, test, prod)
    },
    defaultCorsPreflightOptions: {
      allowOrigins: props.allowedOrigins ?? Cors.ALL_ORIGINS,
      allowMethods: Cors.ALL_METHODS,
      allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    },
    binaryMediaTypes: ['multipart/form-data'],
  });

  let apiKey: undefined | ApiKey;

  // Create API Key and Usage Plan (if enabled)
  if (props.enableApiKey !== false) {
    apiKey = new ApiKey(scope, 'PortfolioApiKey', {
      apiKeyName: `PortfolioApiKey-${props.environment}`,
      description: 'API Key for authorization',
    });

    const usagePlan = new UsagePlan(scope, 'PortfolioApiUsagePlan', {
      name: `PortfolioApiUsagePlan-${props.environment}`,
      description: 'Usage plan for API - security limits',
      apiStages: [
        {
          api: api,
          stage: api.deploymentStage,
        },
      ],
      throttle: {
        rateLimit: 10, // 10 requests per second
        burstLimit: 20, // maximum 20 requests at once
      },
      quota: {
        limit: 10000, // 10,000 requests per day
        period: Period.DAY,
      },
    });

    usagePlan.addApiKey(apiKey);

    // Outputs for API Key
    new CfnOutput(stack, 'PortfolioApiKeyId', {
      value: apiKey.keyId,
      description: 'ID API Key (needed for management)',
    });

    new CfnOutput(stack, 'PortfolioApiKeyValue', {
      value: apiKey.keyId,
      description:
        '⚠️ API Key Value can be found in AWS Console → API Gateway → API Keys. Save it safely!',
    });
  }

  // Outputs for API
  new CfnOutput(stack, 'ApiUrl', {
    value: api.url,
    description: 'API Gateway URL',
    exportName: `ApiUrl-${props.environment}`,
  });

  new CfnOutput(stack, 'ApiId', {
    value: api.restApiId,
    description: 'API Gateway ID',
  });

  return { api, apiKey };
}
