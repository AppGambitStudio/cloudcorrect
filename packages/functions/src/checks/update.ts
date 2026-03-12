import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getGroup, getCheck, updateCheck } from "@cloudcorrect/core";
import { json, error, getTenantId } from "../utils/response.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const tenantId = getTenantId(event);
    const groupId = event.pathParameters?.gid;
    const checkId = event.pathParameters?.cid;

    if (!groupId || !checkId) {
      return error(400, "Group ID and Check ID are required");
    }

    const group = await getGroup(tenantId, groupId);
    if (!group) {
      return error(404, "Group not found or unauthorized");
    }

    const existing = await getCheck(tenantId, groupId, checkId);
    if (!existing) {
      return error(404, "Check not found");
    }

    const body = JSON.parse(event.body || "{}");
    const { service, type, scope, region, parameters, alias, operator } = body;

    const updated = await updateCheck(tenantId, groupId, checkId, {
      service,
      type,
      scope,
      region,
      parameters,
      alias,
      operator,
    });

    return json(200, updated);
  } catch (err) {
    console.error("PATCH /api/invariant-groups/:gid/checks/:cid error:", err);
    return error(500, "Internal server error");
  }
};
