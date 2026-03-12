import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { listAccountsByTenant } from "@cloudcorrect/core";
import { json, error, getTenantId } from "../utils/response.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const tenantId = getTenantId(event);
    const accounts = await listAccountsByTenant(tenantId);
    return json(200, accounts);
  } catch (err) {
    console.error("GET /api/aws-accounts error:", err);
    return error(500, "Internal server error");
  }
};
