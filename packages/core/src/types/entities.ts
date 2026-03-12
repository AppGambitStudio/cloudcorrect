// =============================================================================
// Enums & Union Types
// =============================================================================

export type ServiceId =
  | "EC2"
  | "ALB"
  | "Route53"
  | "IAM"
  | "S3"
  | "NETWORK"
  | "RDS"
  | "ECS"
  | "DynamoDB"
  | "Lambda"
  | "CloudFront"
  | "ConfigService";

export type CheckOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "CONTAINS"
  | "NOT_CONTAINS"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "GREATER_THAN_OR_EQUALS"
  | "LESS_THAN_OR_EQUALS"
  | "IN_LIST"
  | "NOT_IN_LIST"
  | "IS_EMPTY"
  | "IS_NOT_EMPTY";

export type CheckScope = "GLOBAL" | "REGIONAL";

export type GroupStatus = "PASS" | "FAIL" | "PENDING";

export type EvaluationStatus = "PASS" | "FAIL";

export type AuthMethod = "ROLE" | "KEYS";

export type UserRole = "admin" | "member";

// =============================================================================
// Entity Interfaces
// =============================================================================

export interface Tenant {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  cognitoSub: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AWSAccount {
  id: string;
  tenantId: string;
  awsAccountId: string;
  name: string;
  authMethod: AuthMethod;
  roleArn?: string;
  externalId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region: string;
  createdAt: string;
}

export interface InvariantGroup {
  id: string;
  tenantId: string;
  awsAccountId: string;
  name: string;
  description?: string;
  intervalMinutes: number;
  enabled: boolean;
  lastStatus: GroupStatus;
  lastEvaluatedAt?: string;
  notificationEmails?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Check {
  id: string;
  groupId: string;
  tenantId: string;
  service: ServiceId;
  scope: CheckScope;
  region?: string;
  type: string;
  parameters: Record<string, unknown>;
  operator: CheckOperator;
  alias?: string;
  deletedAt?: string;
  createdAt: string;
}

export interface EvaluationRun {
  id: string;
  tenantId: string;
  groupId: string;
  status: EvaluationStatus;
  evaluatedAt: string;
}

export interface CheckResultLog {
  id: string;
  tenantId: string;
  runId: string;
  checkId: string;
  status: EvaluationStatus;
  expected: string;
  observed: string;
  reason: string;
}

// =============================================================================
// DynamoDB Item Types (with key attributes)
// =============================================================================

export interface DynamoItem {
  pk: string;
  sk: string;
  gsi1pk?: string;
  gsi1sk?: string;
  gsi2pk?: string;
  gsi2sk?: string;
  entityType: string;
}

export type TenantItem = Tenant & DynamoItem;
export type UserItem = User & DynamoItem;
export type AWSAccountItem = AWSAccount & DynamoItem;
export type InvariantGroupItem = InvariantGroup & DynamoItem;
export type CheckItem = Check & DynamoItem;

export interface EvaluationRunItem extends EvaluationRun {
  pk: string;
  sk: string;
  entityType: string;
}

export interface CheckResultLogItem extends CheckResultLog {
  pk: string;
  sk: string;
  entityType: string;
}

// =============================================================================
// API Key Entity
// =============================================================================

export interface ApiKey {
  id: string;
  tenantId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt?: string;
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
}

export interface ApiKeyItem extends ApiKey {
  pk: string;
  sk: string;
  gsi1pk: string;
  gsi1sk: string;
  entityType: "ApiKey";
}
