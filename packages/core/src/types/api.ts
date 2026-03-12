import type {
  AuthMethod,
  CheckOperator,
  CheckScope,
  GroupStatus,
  ServiceId,
  UserRole,
  AWSAccount,
  InvariantGroup,
  Check,
  EvaluationRun,
  CheckResultLog,
} from "./entities.js";

// =============================================================================
// Pagination
// =============================================================================

export interface PaginationRequest {
  lastEvaluatedKey?: Record<string, unknown>;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  lastEvaluatedKey?: Record<string, unknown>;
}

// =============================================================================
// Tenant
// =============================================================================

export interface CreateTenantRequest {
  name: string;
}

export interface TenantResponse {
  id: string;
  name: string;
  createdAt: string;
}

// =============================================================================
// User
// =============================================================================

export interface CreateUserRequest {
  cognitoSub: string;
  email: string;
  role?: UserRole;
}

export interface UserResponse {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

// =============================================================================
// AWS Account
// =============================================================================

export interface CreateAccountRequest {
  awsAccountId: string;
  name: string;
  authMethod: AuthMethod;
  roleArn?: string;
  externalId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
}

export interface UpdateAccountRequest {
  name?: string;
  authMethod?: AuthMethod;
  roleArn?: string;
  externalId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
}

export type AccountResponse = Omit<AWSAccount, "secretAccessKey">;

// =============================================================================
// Invariant Group
// =============================================================================

export interface CreateGroupRequest {
  awsAccountId: string;
  name: string;
  description?: string;
  intervalMinutes?: number;
  enabled?: boolean;
  notificationEmails?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  intervalMinutes?: number;
  enabled?: boolean;
  notificationEmails?: string;
}

export interface GroupResponse extends InvariantGroup {
  checks?: Check[];
}

export interface GroupListResponse {
  groups: InvariantGroup[];
}

// =============================================================================
// Check
// =============================================================================

export interface CreateCheckRequest {
  service: ServiceId;
  scope: CheckScope;
  region?: string;
  type: string;
  parameters?: Record<string, unknown>;
  operator?: CheckOperator;
  alias?: string;
}

export interface UpdateCheckRequest {
  service?: ServiceId;
  scope?: CheckScope;
  region?: string;
  type?: string;
  parameters?: Record<string, unknown>;
  operator?: CheckOperator;
  alias?: string;
}

export interface CheckResponse extends Check {}

// =============================================================================
// Evaluation
// =============================================================================

export interface EvaluationRunResponse extends EvaluationRun {
  results?: CheckResultLog[];
}

export interface EvaluationHistoryResponse extends PaginatedResponse<EvaluationRun> {}

export interface RunResultsResponse {
  run: EvaluationRun;
  results: CheckResultLog[];
}
