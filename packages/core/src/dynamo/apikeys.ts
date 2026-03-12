import crypto from "crypto";
import {
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, getMainTable } from "./client.js";
import { apiKeyKey, apiKeyPrefix, apiKeyGsi1Key } from "./keys.js";
import type { ApiKey, ApiKeyItem } from "../types/entities.js";

function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function createApiKey(
  tenantId: string,
  input: { name: string; scopes: string[] },
): Promise<ApiKey & { rawKey: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const rawKey = `cc_${crypto.randomUUID().replace(/-/g, "")}`;
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 11); // "cc_" + first 8 hex chars

  const keys = apiKeyKey(tenantId, id);
  const gsi1 = apiKeyGsi1Key(keyHash);

  const item: ApiKeyItem = {
    ...keys,
    ...gsi1,
    entityType: "ApiKey",
    id,
    tenantId,
    name: input.name,
    keyHash,
    keyPrefix,
    scopes: input.scopes,
    createdAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: getMainTable(),
      Item: item,
    }),
  );

  return { ...stripKeys(item), rawKey };
}

export async function getApiKeyByHash(keyHash: string): Promise<ApiKey | null> {
  const gsi1 = apiKeyGsi1Key(keyHash);

  const result = await docClient.send(
    new QueryCommand({
      TableName: getMainTable(),
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1pk = :pk AND gsi1sk = :sk",
      ExpressionAttributeValues: {
        ":pk": gsi1.gsi1pk,
        ":sk": gsi1.gsi1sk,
      },
      Limit: 1,
    }),
  );

  if (!result.Items || result.Items.length === 0) return null;
  return stripKeys(result.Items[0] as ApiKeyItem);
}

export async function listApiKeysByTenant(tenantId: string): Promise<Omit<ApiKey, "keyHash">[]> {
  const prefix = apiKeyPrefix(tenantId);

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

  return (result.Items ?? []).map((item) => {
    const stripped = stripKeys(item as ApiKeyItem);
    const { keyHash, ...rest } = stripped;
    return rest;
  });
}

export async function revokeApiKey(tenantId: string, keyId: string): Promise<void> {
  const keys = apiKeyKey(tenantId, keyId);

  await docClient.send(
    new UpdateCommand({
      TableName: getMainTable(),
      Key: keys,
      UpdateExpression: "SET revokedAt = :now",
      ExpressionAttributeValues: {
        ":now": new Date().toISOString(),
      },
    }),
  );
}

export async function updateLastUsed(tenantId: string, keyId: string): Promise<void> {
  const keys = apiKeyKey(tenantId, keyId);

  await docClient.send(
    new UpdateCommand({
      TableName: getMainTable(),
      Key: keys,
      UpdateExpression: "SET lastUsedAt = :now",
      ExpressionAttributeValues: {
        ":now": new Date().toISOString(),
      },
    }),
  );
}

function stripKeys(item: ApiKeyItem): ApiKey {
  const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, entityType, ...rest } = item as ApiKeyItem & { gsi2pk?: string; gsi2sk?: string };
  return rest;
}
