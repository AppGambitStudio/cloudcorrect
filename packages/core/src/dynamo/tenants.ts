import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getMainTable } from "./client.js";
import { tenantKey } from "./keys.js";
import type { Tenant, TenantItem } from "../types/entities.js";

export async function createTenant(input: { id: string; name: string }): Promise<Tenant> {
  const now = new Date().toISOString();
  const keys = tenantKey(input.id);

  const item: TenantItem = {
    ...keys,
    entityType: "Tenant",
    id: input.id,
    tenantId: input.id,
    name: input.name,
    createdAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: getMainTable(),
      Item: item,
      ConditionExpression: "attribute_not_exists(pk)",
    }),
  );

  return stripKeys(item);
}

export async function getTenant(tenantId: string): Promise<Tenant | null> {
  const keys = tenantKey(tenantId);

  const result = await docClient.send(
    new GetCommand({
      TableName: getMainTable(),
      Key: keys,
    }),
  );

  if (!result.Item) return null;
  return stripKeys(result.Item as TenantItem);
}

function stripKeys(item: TenantItem): Tenant {
  const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, entityType, ...rest } = item;
  return rest;
}
