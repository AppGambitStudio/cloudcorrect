import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { listApiKeysByTenant } from "@cloudcorrect/core";
import { json, error, getTenantId } from "../utils/response.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const tenantId = getTenantId(event);
    const keys = await listApiKeysByTenant(tenantId);
    return json(200, keys);
  } catch (err) {
    console.error("GET /api/api-keys error:", err);
    return error(500, "Internal server error");
  }
};
