import type { APIGatewayProxyResultV2, APIGatewayProxyEventV2 } from "aws-lambda";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

export function error(statusCode: number, message: string): APIGatewayProxyResultV2 {
  return json(statusCode, { error: message });
}

export function getTenantId(event: APIGatewayProxyEventV2): string {
  return event.requestContext.authorizer!.jwt.claims["custom:tenantId"] as string;
}

export function getCognitoSub(event: APIGatewayProxyEventV2): string {
  return event.requestContext.authorizer!.jwt.claims.sub as string;
}
