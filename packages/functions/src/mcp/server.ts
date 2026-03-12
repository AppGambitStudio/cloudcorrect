import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { registerTools } from "./tools/index.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // tenantId injected by the API key Lambda authorizer
  const tenantId = (event.requestContext as any).authorizer?.lambda?.tenantId as string;

  if (!tenantId) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const server = new McpServer({
    name: "cloudcorrect",
    version: "1.0.0",
  });

  registerTools(server, tenantId);
  registerResources(server, tenantId);
  registerPrompts(server, tenantId);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless mode for Lambda
    enableJsonResponse: true, // JSON responses instead of SSE (simpler for Lambda)
  });

  await server.connect(transport);

  // Convert API Gateway v2 event to a web standard Request
  const url = `https://${event.requestContext.domainName}${event.rawPath}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(event.headers || {})) {
    if (value) headers.set(key, value);
  }

  const method = event.requestContext.http.method;
  const body =
    method !== "GET" && method !== "DELETE" && event.body
      ? event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString()
        : event.body
      : undefined;

  const request = new Request(url, {
    method,
    headers,
    body,
  });

  const response = await transport.handleRequest(request);

  // Convert web Response to API Gateway v2 format
  const responseBody = await response.text();
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  await server.close();

  return {
    statusCode: response.status,
    headers: responseHeaders,
    body: responseBody,
  };
};
