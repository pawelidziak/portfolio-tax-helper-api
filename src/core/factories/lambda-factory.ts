import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';

import { LambdaFunctionConfig } from '../models';

export interface LambdaFactoryResult {
  lambda: NodejsFunction;
}

export const lambdaFactory = (
  scope: Construct,
  config: LambdaFunctionConfig,
  environment: string
): LambdaFactoryResult => {
  // Use bundling options from config or default values
  const bundlingOptions = {
    minify: config.bundling?.minify ?? true,
    sourceMap: config.bundling?.sourceMap ?? true,
    forceDockerBundling: config.bundling?.forceDockerBundling ?? false,
    ...(config.bundling?.loader && { loader: config.bundling.loader }),
  };

  const lambda = new NodejsFunction(scope, `${config.name}Lambda`, {
    runtime: Runtime.NODEJS_24_X,
    handler: 'handler',
    entry: path.join(process.cwd(), 'src', 'lambdas', config.entry),
    environment: {
      ENVIRONMENT: environment,
      ...config.environment,
    },
    description: config.description || `${config.name} Lambda function`,
    timeout: Duration.seconds(30), // 30s timeout for external API calls
    memorySize: 512, // 512MB RAM for faster execution
    bundling: bundlingOptions,
  });

  return { lambda };
};
