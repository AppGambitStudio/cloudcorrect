import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, getMainTable } from "./client.js";
import {
  groupKey,
  groupPrefix,
  groupGsi1Key,
  groupsByAccountGsi1Key,
  schedulerGsi2Key,
} from "./keys.js";
import type { InvariantGroup, InvariantGroupItem, GroupStatus } from "../types/entities.js";

export async function createGroup(
  tenantId: string,
  input: {
    awsAccountId: string;
    name: string;
    description?: string;
    intervalMinutes?: number;
    enabled?: boolean;
    notificationEmails?: string;
  },
): Promise<InvariantGroup> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const keys = groupKey(tenantId, id);
  const gsi1 = groupGsi1Key(tenantId, input.awsAccountId, id);
  const enabled = input.enabled ?? true;
  const intervalMinutes = input.intervalMinutes ?? 5;

  const nextRunAt = enabled ? new Date(Date.now() + intervalMinutes * 60_000).toISOString() : undefined;
  const gsi2 = enabled && nextRunAt ? schedulerGsi2Key(tenantId, id, nextRunAt) : {};

  const item: InvariantGroupItem = {
    ...keys,
    ...gsi1,
    ...gsi2,
    entityType: "InvariantGroup",
    id,
    tenantId,
    awsAccountId: input.awsAccountId,
    name: input.name,
    description: input.description,
    intervalMinutes,
    enabled,
    lastStatus: "PENDING" as GroupStatus,
    notificationEmails: input.notificationEmails,
    nextRunAt,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: getMainTable(),
      Item: item,
    }),
  );

  return stripKeys(item);
}

export async function getGroup(
  tenantId: string,
  groupId: string,
): Promise<InvariantGroup | null> {
  const keys = groupKey(tenantId, groupId);

  const result = await docClient.send(
    new GetCommand({
      TableName: getMainTable(),
      Key: keys,
    }),
  );

  if (!result.Item) return null;
  return stripKeys(result.Item as InvariantGroupItem);
}

export async function listGroupsByTenant(tenantId: string): Promise<InvariantGroup[]> {
  const prefix = groupPrefix(tenantId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: getMainTable(),
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": prefix.pk,
        ":prefix": prefix.skPrefix,
      },
    }),
  );

  return (result.Items ?? []).map((item) => stripKeys(item as InvariantGroupItem));
}

export async function listGroupsByAccount(
  tenantId: string,
  awsAccountId: string,
): Promise<InvariantGroup[]> {
  const gsi1 = groupsByAccountGsi1Key(tenantId, awsAccountId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: getMainTable(),
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1pk = :pk AND begins_with(gsi1sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": gsi1.gsi1pk,
        ":prefix": gsi1.gsi1sk,
      },
    }),
  );

  return (result.Items ?? []).map((item) => stripKeys(item as InvariantGroupItem));
}

export async function updateGroup(
  tenantId: string,
  groupId: string,
  updates: {
    name?: string;
    description?: string;
    intervalMinutes?: number;
    enabled?: boolean;
    notificationEmails?: string;
  },
): Promise<InvariantGroup> {
  const keys = groupKey(tenantId, groupId);
  const now = new Date().toISOString();

  const expressions: string[] = ["#updatedAt = :updatedAt"];
  const names: Record<string, string> = { "#updatedAt": "updatedAt" };
  const values: Record<string, unknown> = { ":updatedAt": now };

  if (updates.name !== undefined) {
    expressions.push("#name = :name");
    names["#name"] = "name";
    values[":name"] = updates.name;
  }
  if (updates.description !== undefined) {
    expressions.push("#description = :description");
    names["#description"] = "description";
    values[":description"] = updates.description;
  }
  if (updates.intervalMinutes !== undefined) {
    expressions.push("#intervalMinutes = :intervalMinutes");
    names["#intervalMinutes"] = "intervalMinutes";
    values[":intervalMinutes"] = updates.intervalMinutes;
  }
  if (updates.enabled !== undefined) {
    expressions.push("#enabled = :enabled");
    names["#enabled"] = "enabled";
    values[":enabled"] = updates.enabled;
  }
  if (updates.notificationEmails !== undefined) {
    expressions.push("#notificationEmails = :notificationEmails");
    names["#notificationEmails"] = "notificationEmails";
    values[":notificationEmails"] = updates.notificationEmails;
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

  return stripKeys(result.Attributes as InvariantGroupItem);
}

export async function toggleGroup(
  tenantId: string,
  groupId: string,
  enabled: boolean,
): Promise<InvariantGroup> {
  const keys = groupKey(tenantId, groupId);
  const now = new Date().toISOString();

  if (enabled) {
    // When enabling, we need the group to compute nextRunAt
    const group = await getGroup(tenantId, groupId);
    if (!group) throw new Error("Group not found");

    const nextRunAt = new Date(Date.now() + group.intervalMinutes * 60_000).toISOString();
    const gsi2 = schedulerGsi2Key(tenantId, groupId, nextRunAt);

    const result = await docClient.send(
      new UpdateCommand({
        TableName: getMainTable(),
        Key: keys,
        UpdateExpression:
          "SET #enabled = :enabled, #nextRunAt = :nextRunAt, #gsi2pk = :gsi2pk, #gsi2sk = :gsi2sk, #updatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#enabled": "enabled",
          "#nextRunAt": "nextRunAt",
          "#gsi2pk": "gsi2pk",
          "#gsi2sk": "gsi2sk",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: {
          ":enabled": true,
          ":nextRunAt": nextRunAt,
          ":gsi2pk": gsi2.gsi2pk,
          ":gsi2sk": gsi2.gsi2sk,
          ":updatedAt": now,
        },
        ReturnValues: "ALL_NEW",
      }),
    );

    return stripKeys(result.Attributes as InvariantGroupItem);
  } else {
    // When disabling, remove GSI2 keys
    const result = await docClient.send(
      new UpdateCommand({
        TableName: getMainTable(),
        Key: keys,
        UpdateExpression:
          "SET #enabled = :enabled, #updatedAt = :updatedAt REMOVE #gsi2pk, #gsi2sk, #nextRunAt",
        ExpressionAttributeNames: {
          "#enabled": "enabled",
          "#gsi2pk": "gsi2pk",
          "#gsi2sk": "gsi2sk",
          "#nextRunAt": "nextRunAt",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: {
          ":enabled": false,
          ":updatedAt": now,
        },
        ReturnValues: "ALL_NEW",
      }),
    );

    return stripKeys(result.Attributes as InvariantGroupItem);
  }
}

export async function updateGroupStatus(
  tenantId: string,
  groupId: string,
  status: GroupStatus,
): Promise<void> {
  const keys = groupKey(tenantId, groupId);
  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: getMainTable(),
      Key: keys,
      UpdateExpression:
        "SET #lastStatus = :status, #lastEvaluatedAt = :now, #updatedAt = :now",
      ExpressionAttributeNames: {
        "#lastStatus": "lastStatus",
        "#lastEvaluatedAt": "lastEvaluatedAt",
        "#updatedAt": "updatedAt",
      },
      ExpressionAttributeValues: {
        ":status": status,
        ":now": now,
      },
    }),
  );
}

export async function getSchedulerDueGroups(
  beforeTimestamp: string,
): Promise<InvariantGroup[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: getMainTable(),
      IndexName: "gsi2",
      KeyConditionExpression: "gsi2pk = :pk AND gsi2sk <= :sk",
      ExpressionAttributeValues: {
        ":pk": "ENABLED",
        ":sk": `NEXT_RUN#${beforeTimestamp}`,
      },
    }),
  );

  return (result.Items ?? []).map((item) => stripKeys(item as InvariantGroupItem));
}

export async function updateNextRunAt(
  tenantId: string,
  groupId: string,
  nextRunAt: string,
): Promise<void> {
  const keys = groupKey(tenantId, groupId);
  const gsi2 = schedulerGsi2Key(tenantId, groupId, nextRunAt);

  await docClient.send(
    new UpdateCommand({
      TableName: getMainTable(),
      Key: keys,
      UpdateExpression:
        "SET #nextRunAt = :nextRunAt, #gsi2pk = :gsi2pk, #gsi2sk = :gsi2sk",
      ExpressionAttributeNames: {
        "#nextRunAt": "nextRunAt",
        "#gsi2pk": "gsi2pk",
        "#gsi2sk": "gsi2sk",
      },
      ExpressionAttributeValues: {
        ":nextRunAt": nextRunAt,
        ":gsi2pk": gsi2.gsi2pk,
        ":gsi2sk": gsi2.gsi2sk,
      },
    }),
  );
}

function stripKeys(item: InvariantGroupItem): InvariantGroup {
  const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, entityType, ...rest } = item;
  return rest;
}
