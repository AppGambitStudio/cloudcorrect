import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getGroup, createCheck } from "@cloudcorrect/core";
import { json, error, getTenantId } from "../utils/response.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const tenantId = getTenantId(event);
    const groupId = event.pathParameters?.id;

    if (!groupId) {
      return error(400, "Group ID is required");
    }

    const group = await getGroup(tenantId, groupId);
    if (!group) {
      return error(404, "Group not found or unauthorized");
    }

    const body = JSON.parse(event.body || "{}");
    const { service, scope, region, type, parameters, operator, alias } = body;

    if (!service || !scope || !type) {
      return error(400, "service, scope, and type are required");
    }

    const check = await createCheck(tenantId, groupId, {
      service,
      scope,
      region,
      type,
      parameters,
      operator,
      alias,
    });

    return json(201, check);
  } catch (err) {
    console.error("POST /api/invariant-groups/:id/checks error:", err);
    return error(500, "Internal server error");
  }
};
