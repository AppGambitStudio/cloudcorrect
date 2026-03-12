import crypto from "crypto";
import type {
  APIGatewayRequestAuthorizerEventV2,
  APIGatewaySimpleAuthorizerWithContextResult,
} from "aws-lambda";
import { getApiKeyByHash, updateLastUsed } from "@cloudcorrect/core";

interface AuthorizerContext {
  tenantId: string;
  apiKeyId: string;
  scopes: string;
}

type AuthResult =
  | { isAuthorized: false }
  | APIGatewaySimpleAuthorizerWithContextResult<AuthorizerContext>;

export const handler = async (
  event: APIGatewayRequestAuthorizerEventV2,
): Promise<AuthResult> => {
  const deny: AuthResult = { isAuthorized: false };

  const authHeader = event.headers?.authorization;
  if (!authHeader) return deny;

  const rawKey = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!rawKey.startsWith("cc_")) return deny;

  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await getApiKeyByHash(keyHash);
  if (!apiKey) return deny;

  if (apiKey.revokedAt) return deny;

  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) return deny;

  // Fire-and-forget: update lastUsedAt without blocking the response
  updateLastUsed(apiKey.tenantId, apiKey.id).catch(() => {});

  return {
    isAuthorized: true,
    context: {
      tenantId: apiKey.tenantId,
      apiKeyId: apiKey.id,
      scopes: apiKey.scopes.join(","),
    },
  };
};
