import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getGroup, getCheck, softDeleteCheck } from "@cloudcorrect/core";
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

    await softDeleteCheck(tenantId, groupId, checkId);

    return json(200, { message: "Check deleted" });
  } catch (err) {
    console.error("DELETE /api/invariant-groups/:gid/checks/:cid error:", err);
    return error(500, "Internal server error");
  }
};
