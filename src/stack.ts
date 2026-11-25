import { StackProps, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { apiGatewayFactory, apiRouterFactory, lambdaFactory } from './core/factories';
import { LAMBDA_FUNCTIONS } from './core/config';

export interface LambdaApiStackProps extends StackProps {
  environment: string;
  allowedOrigins?: string[];
}

/**
 * Main stack for Lambda API
 *
 * To add a new Lambda function:
 * 1. Add an entry to LAMBDA_FUNCTIONS in src/core/config/lambda.config.ts
 * 2. Done!
 */
export class LambdaApiStack extends Stack {
  constructor(scope: Construct, id: string, props: LambdaApiStackProps) {
    super(scope, id, props);

    const apiProps = {
      environment: props.environment,
      enableApiKey: true,
      allowedOrigins: props.allowedOrigins,
    };
    const { api } = apiGatewayFactory(this, apiProps);

    const { addEndpoints } = apiRouterFactory(api);

    for (const lambdaConfig of LAMBDA_FUNCTIONS) {
      const { lambda } = lambdaFactory(this, lambdaConfig, props.environment);
      addEndpoints(lambdaConfig.endpoints, lambda);
    }
  }
}
