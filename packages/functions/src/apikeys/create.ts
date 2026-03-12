import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { createApiKey } from "@cloudcorrect/core";
import { json, error, getTenantId } from "../utils/response.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const tenantId = getTenantId(event);
    const body = JSON.parse(event.body || "{}");

    const { name, scopes } = body;

    if (!name || !scopes || !Array.isArray(scopes)) {
      return error(400, "name and scopes (array) are required");
    }

    const result = await createApiKey(tenantId, { name, scopes });

    return json(201, {
      id: result.id,
      name: result.name,
      keyPrefix: result.keyPrefix,
      scopes: result.scopes,
      createdAt: result.createdAt,
      key: result.rawKey,
    });
  } catch (err) {
    console.error("POST /api/api-keys error:", err);
    return error(500, "Internal server error");
  }
};
