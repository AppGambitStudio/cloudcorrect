import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getGroup, evaluateGroup } from "@cloudcorrect/core";
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

    const result = await evaluateGroup(tenantId, groupId);

    if (result.skipped) {
      return error(400, result.reason!);
    }

    return json(200, result);
  } catch (err) {
    console.error("POST /api/invariant-groups/:id/evaluate error:", err);
    return error(500, "Internal server error");
  }
};
