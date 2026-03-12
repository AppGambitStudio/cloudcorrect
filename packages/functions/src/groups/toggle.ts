import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getGroup, toggleGroup } from "@cloudcorrect/core";
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

    const updated = await toggleGroup(tenantId, groupId, !group.enabled);

    return json(200, updated);
  } catch (err) {
    console.error("PATCH /api/invariant-groups/:id/toggle error:", err);
    return error(500, "Internal server error");
  }
};
