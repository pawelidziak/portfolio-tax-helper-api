#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';

import { LambdaApiStack } from '../src/stack';

const app = new App();

// Get environment from context (default dev)
const env = app.node.tryGetContext('env') || 'dev';

// Environment configuration
const envConfig: Record<string, { account?: string; region: string }> = {
  dev: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'eu-west-1',
  },
  test: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'eu-west-1',
  },
  prod: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'eu-west-1',
  },
};

const config = envConfig[env] || envConfig.dev;

// Comma-separated list, e.g. https://my-app.vercel.app. Unset = every origin (local development only).
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

new LambdaApiStack(app, `PortfolioApiStack-${env}`, {
  env: config,
  environment: env,
  allowedOrigins: allowedOrigins?.length ? allowedOrigins : undefined,
  description: `Stack for Portfolio API environment ${env}`,
});

app.synth();
