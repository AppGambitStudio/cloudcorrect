import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getGroup, updateGroup } from "@cloudcorrect/core";
import { json, error, getTenantId } from "../utils/response.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const tenantId = getTenantId(event);
    const groupId = event.pathParameters?.id;

    if (!groupId) {
      return error(400, "Group ID is required");
    }

    const existing = await getGroup(tenantId, groupId);
    if (!existing) {
      return error(404, "Group not found or unauthorized");
    }

    const body = JSON.parse(event.body || "{}");
    const { name, description, intervalMinutes, notificationEmails } = body;

    const updated = await updateGroup(tenantId, groupId, {
      name,
      description,
      intervalMinutes,
      notificationEmails,
    });

    return json(200, updated);
  } catch (err) {
    console.error("PATCH /api/invariant-groups/:id error:", err);
    return error(500, "Internal server error");
  }
};
