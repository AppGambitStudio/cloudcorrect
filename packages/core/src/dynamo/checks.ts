import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, getMainTable } from "./client.js";
import { checkKey, checkPrefix } from "./keys.js";
import type {
  Check,
  CheckItem,
  CheckOperator,
  CheckScope,
  ServiceId,
} from "../types/entities.js";

export async function createCheck(
  tenantId: string,
  groupId: string,
  input: {
    service: ServiceId;
    scope: CheckScope;
    region?: string;
    type: string;
    parameters?: Record<string, unknown>;
    operator?: CheckOperator;
    alias?: string;
  },
): Promise<Check> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const keys = checkKey(tenantId, groupId, id);

  const item: CheckItem = {
    ...keys,
    entityType: "Check",
    id,
    groupId,
    tenantId,
    service: input.service,
    scope: input.scope,
    region: input.region,
    type: input.type,
    parameters: input.parameters ?? {},
    operator: input.operator ?? "EQUALS",
    alias: input.alias,
    createdAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: getMainTable(),
      Item: item,
    }),
  );

  return stripKeys(item);
}

export async function getCheck(
  tenantId: string,
  groupId: string,
  checkId: string,
): Promise<Check | null> {
  const keys = checkKey(tenantId, groupId, checkId);

  const result = await docClient.send(
    new GetCommand({
      TableName: getMainTable(),
      Key: keys,
    }),
  );

  if (!result.Item) return null;
  const item = result.Item as CheckItem;
  if (item.deletedAt) return null;
  return stripKeys(item);
}

export async function listChecksByGroup(
  tenantId: string,
  groupId: string,
): Promise<Check[]> {
  const prefix = checkPrefix(tenantId, groupId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: getMainTable(),
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      FilterExpression: "attribute_not_exists(deletedAt)",
      ExpressionAttributeValues: {
        ":pk": prefix.pk,
        ":prefix": prefix.skPrefix,
      },
    }),
  );

  return (result.Items ?? []).map((item) => stripKeys(item as CheckItem));
}

export async function updateCheck(
  tenantId: string,
  groupId: string,
  checkId: string,
  updates: {
    service?: ServiceId;
    scope?: CheckScope;
    region?: string;
    type?: string;
    parameters?: Record<string, unknown>;
    operator?: CheckOperator;
    alias?: string;
  },
): Promise<Check> {
  const keys = checkKey(tenantId, groupId, checkId);

  const expressions: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  if (updates.service !== undefined) {
    expressions.push("#service = :service");
    names["#service"] = "service";
    values[":service"] = updates.service;
  }
  if (updates.scope !== undefined) {
    expressions.push("#scope = :scope");
    names["#scope"] = "scope";
    values[":scope"] = updates.scope;
  }
  if (updates.region !== undefined) {
    expressions.push("#region = :region");
    names["#region"] = "region";
    values[":region"] = updates.region;
  }
  if (updates.type !== undefined) {
    expressions.push("#type = :type");
    names["#type"] = "type";
    values[":type"] = updates.type;
  }
  if (updates.parameters !== undefined) {
    expressions.push("#parameters = :parameters");
    names["#parameters"] = "parameters";
    values[":parameters"] = updates.parameters;
  }
  if (updates.operator !== undefined) {
    expressions.push("#operator = :operator");
    names["#operator"] = "operator";
    values[":operator"] = updates.operator;
  }
  if (updates.alias !== undefined) {
    expressions.push("#alias = :alias");
    names["#alias"] = "alias";
    values[":alias"] = updates.alias;
  }

  if (expressions.length === 0) {
    const existing = await getCheck(tenantId, groupId, checkId);
    if (!existing) throw new Error("Check not found");
    return existing;
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: getMainTable(),
      Key: keys,
      UpdateExpression: `SET ${expressions.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    }),
  );

  return stripKeys(result.Attributes as CheckItem);
}

export async function softDeleteCheck(
  tenantId: string,
  groupId: string,
  checkId: string,
): Promise<void> {
  const keys = checkKey(tenantId, groupId, checkId);
  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: getMainTable(),
      Key: keys,
      UpdateExpression: "SET #deletedAt = :deletedAt",
      ExpressionAttributeNames: { "#deletedAt": "deletedAt" },
      ExpressionAttributeValues: { ":deletedAt": now },
    }),
  );
}

function stripKeys(item: CheckItem): Check {
  const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, entityType, ...rest } = item;
  return rest;
}
