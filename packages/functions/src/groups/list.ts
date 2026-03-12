import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { listGroupsByTenant } from "@cloudcorrect/core";
import { json, error, getTenantId } from "../utils/response.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const tenantId = getTenantId(event);
    const groups = await listGroupsByTenant(tenantId);
    return json(200, groups);
  } catch (err) {
    console.error("GET /api/invariant-groups error:", err);
    return error(500, "Internal server error");
  }
};
