import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { LambdaFunctionConfig } from '../models';
import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';

export interface LambdaFactoryResult {
  lambda: NodejsFunction;
}

export const lambdaFactory = (
  scope: Construct,
  config: LambdaFunctionConfig,
  environment: string
): LambdaFactoryResult => {
  const lambda = new NodejsFunction(scope, `${config.name}Lambda`, {
    runtime: Runtime.NODEJS_20_X,
    handler: 'handler',
    entry: path.join(process.cwd(), 'src', 'lambdas', config.entry),
    environment: {
      ENVIRONMENT: environment,
      ...config.environment,
    },
    description: config.description || `${config.name} Lambda function`,
    timeout: Duration.seconds(30), // Timeout 30s dla wywołań API zewnętrznych
    memorySize: 512, // 512MB RAM dla szybszego wykonania
    bundling: {
      minify: true,
      sourceMap: true,
      forceDockerBundling: false,
    },
  });

  return { lambda };
};
