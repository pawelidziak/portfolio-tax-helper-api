import { APIGatewayProxyResult } from 'aws-lambda';

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

/**
 * Helper to create HTTP response
 */
export const createResponse = (statusCode: number, data: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers,
  body: JSON.stringify(data),
});
