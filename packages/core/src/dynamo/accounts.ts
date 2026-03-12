import {
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, getMainTable } from "./client.js";
import { accountKey, accountPrefix } from "./keys.js";
import type { AWSAccount, AWSAccountItem, AuthMethod } from "../types/entities.js";

export async function createAccount(
  tenantId: string,
  input: {
    awsAccountId: string;
    name: string;
    authMethod: AuthMethod;
    roleArn?: string;
    externalId?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
  },
): Promise<AWSAccount> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const keys = accountKey(tenantId, id);

  const item: AWSAccountItem = {
    ...keys,
    entityType: "AWSAccount",
    id,
    tenantId,
    awsAccountId: input.awsAccountId,
    name: input.name,
    authMethod: input.authMethod,
    roleArn: input.roleArn,
    externalId: input.externalId,
    accessKeyId: input.accessKeyId,
    secretAccessKey: input.secretAccessKey,
    region: input.region ?? "us-east-1",
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

export async function getAccount(
  tenantId: string,
  accountId: string,
): Promise<AWSAccount | null> {
  const keys = accountKey(tenantId, accountId);

  const result = await docClient.send(
    new GetCommand({
      TableName: getMainTable(),
      Key: keys,
    }),
  );

  if (!result.Item) return null;
  return stripKeys(result.Item as AWSAccountItem);
}

export async function listAccountsByTenant(tenantId: string): Promise<AWSAccount[]> {
  const prefix = accountPrefix(tenantId);

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

  return (result.Items ?? []).map((item) => stripKeys(item as AWSAccountItem));
}

export async function deleteAccount(tenantId: string, accountId: string): Promise<void> {
  const keys = accountKey(tenantId, accountId);

  await docClient.send(
    new DeleteCommand({
      TableName: getMainTable(),
      Key: keys,
    }),
  );
}

function stripKeys(item: AWSAccountItem): AWSAccount {
  const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, entityType, ...rest } = item;
  return rest;
}
