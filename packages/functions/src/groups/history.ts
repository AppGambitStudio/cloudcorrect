import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getGroup, listRunsByGroup, getRunResults } from "@cloudcorrect/core";
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

    const limit = parseInt(event.queryStringParameters?.limit || "10", 10);
    const lastEvaluatedKey = event.queryStringParameters?.cursor
      ? JSON.parse(decodeURIComponent(event.queryStringParameters.cursor))
      : undefined;

    const { items: runs, lastEvaluatedKey: nextKey } = await listRunsByGroup(
      tenantId,
      groupId,
      { limit, lastEvaluatedKey },
    );

    // Fetch results for each run
    const runsWithResults = await Promise.all(
      runs.map(async (run) => {
        const results = await getRunResults(tenantId, run.id);
        return { ...run, results };
      }),
    );

    return json(200, {
      runs: runsWithResults,
      lastEvaluatedKey: nextKey,
    });
  } catch (err) {
    console.error("GET /api/invariant-groups/:id/history error:", err);
    return error(500, "Internal server error");
  }
};
