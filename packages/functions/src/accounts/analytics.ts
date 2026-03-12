import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getAccount, listGroupsByAccount, listRunsByGroup } from "@cloudcorrect/core";
import { json, error, getTenantId } from "../utils/response.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const tenantId = getTenantId(event);
    const accountId = event.pathParameters?.id;

    if (!accountId) {
      return error(400, "Account ID is required");
    }

    const account = await getAccount(tenantId, accountId);
    if (!account) {
      return error(404, "Account not found or unauthorized");
    }

    const groups = await listGroupsByAccount(tenantId, accountId);

    const stats = {
      totalGroups: groups.length,
      activeGroups: groups.filter((g) => g.enabled).length,
      passGroups: groups.filter((g) => g.enabled && g.lastStatus === "PASS").length,
      failGroups: groups.filter((g) => g.enabled && g.lastStatus === "FAIL").length,
      pendingGroups: groups.filter((g) => g.enabled && g.lastStatus === "PENDING").length,
      totalChecks: 0,
    };

    // Fetch last 5 evaluation runs across all groups for this account
    const groupIds = groups.map((g) => g.id);
    const recentRunsPromises = groupIds.map((gid) =>
      listRunsByGroup(tenantId, gid, { limit: 5 }),
    );
    const runResults = await Promise.all(recentRunsPromises);
    const recentRuns = runResults
      .flatMap((r) => r.items)
      .sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt))
      .slice(0, 10);

    return json(200, { account, stats, recentRuns, groups });
  } catch (err) {
    console.error("GET /api/aws-accounts/:id/analytics error:", err);
    return error(500, "Internal server error");
  }
};
