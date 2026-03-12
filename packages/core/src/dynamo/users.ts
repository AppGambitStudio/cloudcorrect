import { PutCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getMainTable } from "./client.js";
import { userKey, userGsi1Key } from "./keys.js";
import type { User, UserItem, UserRole } from "../types/entities.js";

export async function createUser(
  tenantId: string,
  input: {
    cognitoSub: string;
    email: string;
    role?: UserRole;
  },
): Promise<User> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const keys = userKey(tenantId, id);
  const gsi1 = userGsi1Key(input.cognitoSub);

  const item: UserItem = {
    ...keys,
    ...gsi1,
    entityType: "User",
    id,
    tenantId,
    cognitoSub: input.cognitoSub,
    email: input.email,
    role: input.role ?? "member",
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

export async function getUserByTenantId(
  tenantId: string,
  userId: string,
): Promise<User | null> {
  const keys = userKey(tenantId, userId);

  const result = await docClient.send(
    new GetCommand({
      TableName: getMainTable(),
      Key: keys,
    }),
  );

  if (!result.Item) return null;
  return stripKeys(result.Item as UserItem);
}

export async function getUserByCognitoSub(cognitoSub: string): Promise<User | null> {
  const gsi1 = userGsi1Key(cognitoSub);

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
  return stripKeys(result.Items[0] as UserItem);
}

function stripKeys(item: UserItem): User {
  const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, entityType, ...rest } = item;
  return rest;
}
