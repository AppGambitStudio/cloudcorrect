import { auth, authClient } from "./auth";
import { mainTable, evaluationsTable } from "./database";

const defaultFunctionProps: sst.aws.FunctionArgs = {
  runtime: "nodejs22.x",
  architecture: "arm64",
  link: [mainTable, evaluationsTable],
};

export const api = new sst.aws.ApiGatewayV2("Api", {
  cors: true,
  transform: {
    route: {
      handler: defaultFunctionProps,
    },
  },
});

const cognitoAuthorizer = api.addAuthorizer({
  name: "CognitoAuthorizer",
  jwt: {
    issuer: $interpolate`https://cognito-idp.${aws.getRegionOutput().name}.amazonaws.com/${auth.id}`,
    audiences: [authClient.id],
  },
});

// Auth routes
api.route("GET /api/auth/me", {
  handler: "packages/functions/src/auth/me.handler",
}, { auth: { jwt: { authorizer: cognitoAuthorizer.id } } });

// AWS Accounts routes
api.route("POST /api/aws-accounts", {
  handler: "packages/functions/src/accounts/create.handler",
}, { auth: { jwt: { authorizer: cognitoAuthorizer.id } } });

api.route("GET /api/aws-accounts", {
  handler: "packages/functions/src/accounts/list.handler",
}, { auth: { jwt: { authorizer: cognitoAuthorizer.id } } });

api.route("GET /api/aws-accounts/{id}/analytics", {
  handler: "packages/functions/src/accounts/analytics.handler",
}, { auth: { jwt: { authorizer: cognitoAuthorizer.id } } });

// Invariant Groups routes
api.route("POST /api/invariant-groups", {
  handler: "packages/functions/src/groups/create.handler",
}, { auth: { jwt: { authorizer: cognitoAuthorizer.id } } });

api.route("GET /api/invariant-groups", {
  handler: "packages/functions/src/groups/list.handler",
}, { auth: { jwt: { authorizer: cognitoAuthorizer.id } } });

api.route("GET /api/invariant-groups/{id}", {
  handler: "packages/functions/src/groups/get.handler",
}, { auth: { jwt: { authorizer: cognitoAuthorizer.id } } });

api.route("PATCH /api/invariant-groups/{id}", {
  handler: "packages/functions/src/groups/update.handler",
}, { auth: { jwt: { authorizer: cognitoAuthorizer.id } } });

api.route("PATCH /api/invariant-groups/{id}/toggle", {
  handler: "packages/functions/src/groups/toggle.handler",
}, { auth: { jwt: { authorizer: cognitoAuthorizer.id } } });

api.route("GET /api/invariant-groups/{id}/history", {
  handler: "packages/functions/src/groups/history.handler",
}, { auth: { jwt: { authorizer: cognitoAuthorizer.id } } });

api.route("POST /api/invariant-groups/{id}/evaluate", {
  handler: "packages/functions/src/groups/evaluate.handler",
}, { auth: { jwt: { authorizer: cognitoAuthorizer.id } } });

// Checks routes
api.route("POST /api/invariant-groups/{id}/checks", {
  handler: "packages/functions/src/checks/create.handler",
}, { auth: { jwt: { authorizer: cognitoAuthorizer.id } } });

api.route("PATCH /api/invariant-groups/{gid}/checks/{cid}", {
  handler: "packages/functions/src/checks/update.handler",
}, { auth: { jwt: { authorizer: cognitoAuthorizer.id } } });

api.route("DELETE /api/invariant-groups/{gid}/checks/{cid}", {
  handler: "packages/functions/src/checks/delete.handler",
}, { auth: { jwt: { authorizer: cognitoAuthorizer.id } } });

// API Keys management routes (Cognito auth)
api.route("POST /api/api-keys", {
  handler: "packages/functions/src/apikeys/create.handler",
}, { auth: { jwt: { authorizer: cognitoAuthorizer.id } } });

api.route("GET /api/api-keys", {
  handler: "packages/functions/src/apikeys/list.handler",
}, { auth: { jwt: { authorizer: cognitoAuthorizer.id } } });

api.route("DELETE /api/api-keys/{id}", {
  handler: "packages/functions/src/apikeys/revoke.handler",
}, { auth: { jwt: { authorizer: cognitoAuthorizer.id } } });

// Lambda authorizer for MCP routes (API key auth)
export const apiKeyAuthorizer = api.addAuthorizer({
  name: "ApiKeyAuthorizer",
  lambda: {
    function: {
      handler: "packages/functions/src/auth/api-key-authorizer.handler",
      runtime: "nodejs22.x",
      architecture: "arm64",
      link: [mainTable],
    },
  },
});

// Health check (no auth)
api.route("GET /health", {
  handler: "packages/functions/src/health.handler",
});
