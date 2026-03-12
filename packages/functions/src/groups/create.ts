import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { createGroup, createCheck } from "@cloudcorrect/core";
import { json, error, getTenantId } from "../utils/response.js";

const VALID_OPERATORS = [
  "EQUALS", "NOT_EQUALS", "CONTAINS", "NOT_CONTAINS",
  "GREATER_THAN", "LESS_THAN", "GREATER_THAN_OR_EQUALS", "LESS_THAN_OR_EQUALS",
  "IN_LIST", "NOT_IN_LIST", "IS_EMPTY", "IS_NOT_EMPTY",
] as const;

const COUNT_CHECK_TYPES = [
  "RUNNING_INSTANCE_COUNT", "INSTANCE_COUNT",
  "S3_BUCKET_COUNT", "S3_OBJECT_COUNT",
  "LAMBDA_FUNCTION_COUNT",
] as const;

function validateCheckData(checkData: any): string | null {
  const { type, operator, parameters } = checkData;

  if (operator !== undefined) {
    if (!(VALID_OPERATORS as readonly string[]).includes(operator)) {
      return `Invalid operator: ${operator}. Valid operators are: ${VALID_OPERATORS.join(", ")}`;
    }
  }

  if ((COUNT_CHECK_TYPES as readonly string[]).includes(type)) {
    if (!parameters || parameters.expectedCount === undefined || parameters.expectedCount === null) {
      return `expectedCount is required in parameters for check type: ${type}`;
    }
    const expectedCount = Number(parameters.expectedCount);
    if (isNaN(expectedCount)) {
      return `expectedCount must be a valid number for check type: ${type}`;
    }
    if (expectedCount < 0) {
      return `expectedCount must be a non-negative number for check type: ${type}`;
    }
  }

  return null;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const tenantId = getTenantId(event);
    const body = JSON.parse(event.body || "{}");

    const { awsAccountId, name, description, intervalMinutes, enabled, notificationEmails, checks } = body;

    if (!awsAccountId || !name) {
      return error(400, "awsAccountId and name are required");
    }

    // Validate all checks before creating the group
    if (checks && Array.isArray(checks)) {
      for (let i = 0; i < checks.length; i++) {
        const validationError = validateCheckData(checks[i]);
        if (validationError) {
          return error(400, `Check ${i + 1}: ${validationError}`);
        }
      }
    }

    const group = await createGroup(tenantId, {
      awsAccountId,
      name,
      description,
      intervalMinutes,
      enabled,
      notificationEmails,
    });

    const createdChecks = [];
    if (checks && Array.isArray(checks)) {
      for (const checkData of checks) {
        const check = await createCheck(tenantId, group.id, {
          service: checkData.service,
          scope: checkData.scope,
          region: checkData.region,
          type: checkData.type,
          parameters: checkData.parameters,
          operator: checkData.operator,
          alias: checkData.alias,
        });
        createdChecks.push(check);
      }
    }

    return json(201, { ...group, checks: createdChecks });
  } catch (err) {
    console.error("POST /api/invariant-groups error:", err);
    return error(500, "Internal server error");
  }
};
