// =============================================================================
// Key Builders — Main Table
// =============================================================================

export function tenantKey(tenantId: string) {
  return {
    pk: `TENANT#${tenantId}`,
    sk: "TENANT",
  };
}

export function userKey(tenantId: string, userId: string) {
  return {
    pk: `TENANT#${tenantId}`,
    sk: `USER#${userId}`,
  };
}

export function accountKey(tenantId: string, accountId: string) {
  return {
    pk: `TENANT#${tenantId}`,
    sk: `ACCOUNT#${accountId}`,
  };
}

export function groupKey(tenantId: string, groupId: string) {
  return {
    pk: `TENANT#${tenantId}`,
    sk: `GROUP#${groupId}`,
  };
}

export function checkKey(tenantId: string, groupId: string, checkId: string) {
  return {
    pk: `TENANT#${tenantId}#GROUP#${groupId}`,
    sk: `CHECK#${checkId}`,
  };
}

// =============================================================================
// Prefix Builders (for begins_with queries)
// =============================================================================

export function userPrefix(tenantId: string) {
  return {
    pk: `TENANT#${tenantId}`,
    skPrefix: "USER#",
  };
}

export function accountPrefix(tenantId: string) {
  return {
    pk: `TENANT#${tenantId}`,
    skPrefix: "ACCOUNT#",
  };
}

export function groupPrefix(tenantId: string) {
  return {
    pk: `TENANT#${tenantId}`,
    skPrefix: "GROUP#",
  };
}

export function checkPrefix(tenantId: string, groupId: string) {
  return {
    pk: `TENANT#${tenantId}#GROUP#${groupId}`,
    skPrefix: "CHECK#",
  };
}

// =============================================================================
// GSI1 Key Builders — Main Table
// =============================================================================

export function userGsi1Key(cognitoSub: string) {
  return {
    gsi1pk: `COGNITO#${cognitoSub}`,
    gsi1sk: "USER",
  };
}

export function groupsByAccountGsi1Key(tenantId: string, awsAccountId: string) {
  return {
    gsi1pk: `TENANT#${tenantId}#ACCOUNT#${awsAccountId}`,
    gsi1sk: "GROUP#",
  };
}

export function groupGsi1Key(tenantId: string, awsAccountId: string, groupId: string) {
  return {
    gsi1pk: `TENANT#${tenantId}#ACCOUNT#${awsAccountId}`,
    gsi1sk: `GROUP#${groupId}`,
  };
}

// =============================================================================
// GSI2 Key Builders — Scheduler Index
// =============================================================================

export function schedulerGsi2Key(tenantId: string, groupId: string, nextRunAt: string) {
  return {
    gsi2pk: "ENABLED",
    gsi2sk: `NEXT_RUN#${nextRunAt}#${tenantId}#${groupId}`,
  };
}

// =============================================================================
// ApiKey Key Builders
// =============================================================================

// ApiKey: PK=TENANT#<tenantId>, SK=APIKEY#<keyId>
export function apiKeyKey(tenantId: string, keyId: string) {
  return {
    pk: `TENANT#${tenantId}`,
    sk: `APIKEY#${keyId}`,
  };
}

export function apiKeyPrefix(tenantId: string) {
  return {
    pk: `TENANT#${tenantId}`,
    skPrefix: "APIKEY#",
  };
}

// GSI1: PK=APIKEY#<keyHash>, SK=APIKEY — for lookup by hash during auth
export function apiKeyGsi1Key(keyHash: string) {
  return {
    gsi1pk: `APIKEY#${keyHash}`,
    gsi1sk: "APIKEY",
  };
}

// =============================================================================
// Key Builders — Evaluations Table
// =============================================================================

export function evaluationRunKey(
  tenantId: string,
  groupId: string,
  timestamp: string,
  runId: string,
) {
  return {
    pk: `TENANT#${tenantId}#GROUP#${groupId}`,
    sk: `RUN#${timestamp}#${runId}`,
  };
}

export function evaluationRunPrefix(tenantId: string, groupId: string) {
  return {
    pk: `TENANT#${tenantId}#GROUP#${groupId}`,
    skPrefix: "RUN#",
  };
}

export function checkResultKey(tenantId: string, runId: string, checkId: string) {
  return {
    pk: `TENANT#${tenantId}#RUN#${runId}`,
    sk: `RESULT#${checkId}`,
  };
}

export function checkResultPrefix(tenantId: string, runId: string) {
  return {
    pk: `TENANT#${tenantId}#RUN#${runId}`,
    skPrefix: "RESULT#",
  };
}
