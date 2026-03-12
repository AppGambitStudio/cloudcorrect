import { api, apiKeyAuthorizer } from "./api";
import { mainTable, evaluationsTable } from "./database";
import { evaluationQueue } from "./scheduler";

// MCP function props — longer timeout for AI agent interactions
const mcpFunctionProps: sst.aws.FunctionArgs = {
  handler: "packages/functions/src/mcp/server.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "60 seconds",
  link: [mainTable, evaluationsTable, evaluationQueue],
};

const mcpAuth = { auth: { lambda: apiKeyAuthorizer.id } };

// MCP endpoint — POST for JSON-RPC requests
api.route("POST /mcp", mcpFunctionProps, mcpAuth);

// GET for SSE streaming
api.route("GET /mcp", mcpFunctionProps, mcpAuth);

// DELETE for session cleanup
api.route("DELETE /mcp", mcpFunctionProps, mcpAuth);
