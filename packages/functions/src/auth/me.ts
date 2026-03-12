import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getUserByCognitoSub, getTenant } from "@cloudcorrect/core";
import { json, error, getTenantId, getCognitoSub } from "../utils/response.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const sub = getCognitoSub(event);
    const tenantId = getTenantId(event);

    const [user, tenant] = await Promise.all([
      getUserByCognitoSub(sub),
      getTenant(tenantId),
    ]);

    if (!user || !tenant) {
      return error(404, "User or tenant not found");
    }

    return json(200, {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
    });
  } catch (err) {
    console.error("GET /api/auth/me error:", err);
    return error(500, "Internal server error");
  }
};
