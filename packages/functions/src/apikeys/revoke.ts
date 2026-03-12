import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { revokeApiKey } from "@cloudcorrect/core";
import { json, error, getTenantId } from "../utils/response.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const tenantId = getTenantId(event);
    const keyId = event.pathParameters?.id;

    if (!keyId) {
      return error(400, "API key id is required");
    }

    await revokeApiKey(tenantId, keyId);
    return json(200, { message: "API key revoked" });
  } catch (err) {
    console.error("DELETE /api/api-keys/{id} error:", err);
    return error(500, "Internal server error");
  }
};
