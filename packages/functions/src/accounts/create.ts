import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { createAccount } from "@cloudcorrect/core";
import { json, error, getTenantId } from "../utils/response.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const tenantId = getTenantId(event);
    const body = JSON.parse(event.body || "{}");

    const { awsAccountId, name, authMethod, roleArn, externalId, accessKeyId, secretAccessKey, region } = body;

    if (!awsAccountId || !name || !authMethod) {
      return error(400, "awsAccountId, name, and authMethod are required");
    }

    const account = await createAccount(tenantId, {
      awsAccountId,
      name,
      authMethod,
      roleArn,
      externalId: externalId || (authMethod === "ROLE" ? crypto.randomUUID() : undefined),
      accessKeyId,
      secretAccessKey,
      region,
    });

    return json(201, account);
  } catch (err) {
    console.error("POST /api/aws-accounts error:", err);
    return error(500, "Internal server error");
  }
};
