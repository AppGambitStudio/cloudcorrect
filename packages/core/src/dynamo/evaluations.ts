import {
  PutCommand,
  QueryCommand,
  BatchWriteCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, getEvaluationsTable } from "./client.js";
import {
  evaluationRunKey,
  evaluationRunPrefix,
  checkResultKey,
  checkResultPrefix,
} from "./keys.js";
import type {
  EvaluationRun,
  EvaluationRunItem,
  CheckResultLog,
  CheckResultLogItem,
  EvaluationStatus,
} from "../types/entities.js";

export async function createEvaluationRun(
  tenantId: string,
  groupId: string,
  status: EvaluationStatus,
): Promise<EvaluationRun> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const keys = evaluationRunKey(tenantId, groupId, now, id);

  const item: EvaluationRunItem = {
    ...keys,
    entityType: "EvaluationRun",
    id,
    tenantId,
    groupId,
    status,
    evaluatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: getEvaluationsTable(),
      Item: item,
    }),
  );

  return stripRunKeys(item);
}

export async function createCheckResultLog(
  tenantId: string,
  runId: string,
  input: {
    checkId: string;
    status: EvaluationStatus;
    expected: string;
    observed: string;
    reason: string;
  },
): Promise<CheckResultLog> {
  const id = crypto.randomUUID();
  const keys = checkResultKey(tenantId, runId, input.checkId);

  const item: CheckResultLogItem = {
    ...keys,
    entityType: "CheckResultLog",
    id,
    tenantId,
    runId,
    checkId: input.checkId,
    status: input.status,
    expected: input.expected,
    observed: input.observed,
    reason: input.reason,
  };

  await docClient.send(
    new PutCommand({
      TableName: getEvaluationsTable(),
      Item: item,
    }),
  );

  return stripResultKeys(item);
}

export async function batchWriteResults(
  tenantId: string,
  runId: string,
  results: Array<{
    checkId: string;
    status: EvaluationStatus;
    expected: string;
    observed: string;
    reason: string;
  }>,
): Promise<void> {
  // DynamoDB BatchWrite supports max 25 items per request
  const BATCH_SIZE = 25;

  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);

    const putRequests = batch.map((result) => {
      const id = crypto.randomUUID();
      const keys = checkResultKey(tenantId, runId, result.checkId);

      return {
        PutRequest: {
          Item: {
            ...keys,
            entityType: "CheckResultLog",
            id,
            tenantId,
            runId,
            checkId: result.checkId,
            status: result.status,
            expected: result.expected,
            observed: result.observed,
            reason: result.reason,
          },
        },
      };
    });

    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [getEvaluationsTable()]: putRequests,
        },
      }),
    );
  }
}

export async function listRunsByGroup(
  tenantId: string,
  groupId: string,
  options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> },
): Promise<{
  items: EvaluationRun[];
  lastEvaluatedKey?: Record<string, unknown>;
}> {
  const prefix = evaluationRunPrefix(tenantId, groupId);
  const limit = options?.limit ?? 20;

  const result = await docClient.send(
    new QueryCommand({
      TableName: getEvaluationsTable(),
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": prefix.pk,
        ":prefix": prefix.skPrefix,
      },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: options?.lastEvaluatedKey as Record<string, string> | undefined,
    }),
  );

  return {
    items: (result.Items ?? []).map((item) => stripRunKeys(item as EvaluationRunItem)),
    lastEvaluatedKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
  };
}

export async function getRunResults(
  tenantId: string,
  runId: string,
): Promise<CheckResultLog[]> {
  const prefix = checkResultPrefix(tenantId, runId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: getEvaluationsTable(),
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": prefix.pk,
        ":prefix": prefix.skPrefix,
      },
    }),
  );

  return (result.Items ?? []).map((item) => stripResultKeys(item as CheckResultLogItem));
}

function stripRunKeys(item: EvaluationRunItem): EvaluationRun {
  const { pk, sk, entityType, ...rest } = item;
  return rest;
}

function stripResultKeys(item: CheckResultLogItem): CheckResultLog {
  const { pk, sk, entityType, ...rest } = item;
  return rest;
}
