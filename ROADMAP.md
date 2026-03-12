# CloudCorrect Roadmap

## Current State (v1 — Docker Compose Monorepo)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 16 + React 19 + Shadcn UI | Port 8800 |
| Backend | Express 5 + TypeScript | Port 5001 |
| Database | PostgreSQL 15 (Sequelize ORM) | Port 5437, `sync({ alter: true })` |
| Scheduler | node-cron (1-min tick) | In-process, evaluates groups by interval |
| Auth | JWT (bcryptjs + jsonwebtoken) | 8h expiry, localStorage |
| Alerts | AWS SES | Email on status change or failure |
| AWS Integration | SDK v3 (12+ services) | STS AssumeRole + static keys |
| Deployment | Docker Compose | 3 containers, no CI/CD pipeline |

### Current Limitations
- **Single-process scheduler** — cron runs in-process, no fault tolerance or distribution
- **No horizontal scaling** — Express server is stateful (scheduler state)
- **Manual deployment** — Docker Compose, no automated CI/CD
- **Sequelize auto-sync** — `alter: true` is risky for production migrations
- **No API rate limiting** — No throttling or usage metering
- **Secrets in env vars** — AWS keys stored in DB without encryption at rest
- **No WebSocket/real-time** — Frontend polls for evaluation results
- **No test suite** — `npm test` is a stub

---

## Finalized Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Database** | DynamoDB (2 tables) | No VPC needed, no connection pooling, true serverless, scales to zero |
| **Auth** | Cognito User Pools (self-signup) | Managed auth with MFA, password policies, token refresh, onboarding flow |
| **Monorepo** | pnpm workspaces | SST v4 default, simple, well-supported |
| **Domain** | CloudFront only (no custom domain) | Defer custom domain to later |
| **AWS Creds** | Stored in DynamoDB | Primarily cross-account IAM roles; key-based auth is secondary |
| **Eval History** | Keep forever | No TTL, full audit trail |
| **MCP Transport** | Lambda + Streamable HTTP | Serverless, no always-on cost |
| **IaC** | SST v4 | Local dev with `sst dev`, resource linking, TypeScript-native |

---

## DynamoDB Table Design

**Tenant-first partition key on BOTH tables** — enforces tenant isolation at the data layer. No query can ever accidentally cross tenant boundaries.

### Table 1: `CloudCorrect-Main`

| Entity | PK | SK | Attributes |
|--------|----|----|------------|
| Tenant | `TENANT#<tenantId>` | `TENANT` | name, createdAt |
| User | `TENANT#<tenantId>` | `USER#<userId>` | cognitoSub, email, role |
| AWSAccount | `TENANT#<tenantId>` | `ACCOUNT#<accountId>` | awsAccountId, name, authMethod, roleArn, externalId, accessKeyId, secretAccessKey, region |
| InvariantGroup | `TENANT#<tenantId>` | `GROUP#<groupId>` | awsAccountId, name, description, intervalMinutes, enabled, lastStatus, lastEvaluatedAt, notificationEmails, nextRunAt |
| Check | `TENANT#<tenantId>#GROUP#<groupId>` | `CHECK#<checkId>` | service, scope, region, type, parameters, operator, alias, deletedAt |

**GSI1** — Overloaded cross-entity index:

| Entity | GSI1PK | GSI1SK | Use case |
|--------|--------|--------|----------|
| User | `COGNITO#<cognitoSub>` | `USER` | Map Cognito user → tenant on login |
| InvariantGroup | `TENANT#<tenantId>#ACCOUNT#<awsAccountId>` | `GROUP#<groupId>` | List groups per AWS account (analytics) |

**GSI2** — Scheduler index:

| Entity | GSI2PK | GSI2SK | Use case |
|--------|--------|--------|----------|
| InvariantGroup | `ENABLED` | `NEXT_RUN#<isoTimestamp>#<tenantId>#<groupId>` | Query groups due for evaluation |

Scheduler Lambda queries: `GSI2PK = "ENABLED" AND GSI2SK <= "NEXT_RUN#<now>"` → returns exactly the groups that need evaluation, no scan.

**Access Patterns — Main Table:**

| Pattern | Query |
|---------|-------|
| Get tenant metadata | PK=`TENANT#x`, SK=`TENANT` |
| List all accounts for tenant | PK=`TENANT#x`, SK begins_with `ACCOUNT#` |
| List all groups for tenant | PK=`TENANT#x`, SK begins_with `GROUP#` |
| Get single group | PK=`TENANT#x`, SK=`GROUP#y` |
| List checks for a group | PK=`TENANT#x#GROUP#y`, SK begins_with `CHECK#` |
| Get group detail + checks | Batch: group query + checks query (2 queries, same tenant) |
| Login (Cognito sub → tenant) | GSI1: PK=`COGNITO#sub` |
| Groups per AWS account | GSI1: PK=`TENANT#x#ACCOUNT#y`, SK begins_with `GROUP#` |
| Scheduler tick | GSI2: PK=`ENABLED`, SK <= `NEXT_RUN#<now>` |

### Table 2: `CloudCorrect-Evaluations`

| Entity | PK | SK | Attributes |
|--------|----|----|------------|
| EvaluationRun | `TENANT#<tenantId>#GROUP#<groupId>` | `RUN#<isoTimestamp>#<runId>` | status (PASS/FAIL), evaluatedAt |
| CheckResultLog | `TENANT#<tenantId>#RUN#<runId>` | `RESULT#<checkId>` | status, expected, observed, reason, service, checkType |

**Access Patterns — Evaluations Table:**

| Pattern | Query |
|---------|-------|
| List runs for group (paginated, newest first) | PK=`TENANT#x#GROUP#y`, SK begins_with `RUN#`, ScanIndexForward=false |
| Get all results for a run | PK=`TENANT#x#RUN#z`, SK begins_with `RESULT#` |

No TTL — evaluation history kept indefinitely for audit compliance.

---

## AWS Service Map (Finalized)

```
┌─────────────────────────────────────────────────────────────┐
│                        CloudFront                           │
│                    (Next.js Frontend)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   API Gateway v2 (HTTP)                      │
│              /api/*  routes + /mcp endpoint                  │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │ Cognito     │  │ Lambda      │  │ Lambda Authorizer │    │
│  │ Authorizer  │  │ Handlers    │  │ (API Keys - MCP)  │    │
│  └──────┬──────┘  └──────┬──────┘  └────────┬─────────┘    │
└─────────┼────────────────┼──────────────────┼───────────────┘
          │                │                  │
          ▼                ▼                  ▼
┌──────────────┐  ┌──────────────┐   ┌──────────────┐
│   Cognito    │  │  DynamoDB    │   │  MCP Server  │
│  User Pool   │  │  (2 tables)  │   │  (Lambda)    │
│  self-signup │  │  Main + Eval │   │              │
└──────────────┘  └──────────────┘   └──────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   ┌────────────┐ ┌───────────┐ ┌────────────┐
   │ EventBridge│ │    SQS    │ │    SES     │
   │ Scheduler  │ │  Queue +  │ │  (Alerts)  │
   │ (1-min)    │ │   DLQ     │ │            │
   └─────┬──────┘ └─────┬─────┘ └────────────┘
         │               │
         ▼               ▼
   ┌────────────┐ ┌────────────┐
   │ Tick       │ │ Evaluate   │
   │ Lambda     │ │ Lambda     │─── AWS SDK v3 ──► Target AWS Accounts
   │ (fan-out)  │ │ (SQS)     │    (STS AssumeRole)
   └────────────┘ └────────────┘
```

### Complete Resource List

| Category | Service | Resource | Purpose |
|----------|---------|----------|---------|
| **Compute** | Lambda | ~15 API handlers | REST API endpoints |
| | Lambda | scheduler-tick | EventBridge → query due groups → SQS |
| | Lambda | evaluate-group | SQS consumer, runs checks against AWS |
| | Lambda | cognito-post-confirm | Creates Tenant + User in DynamoDB on signup |
| | Lambda | mcp-server | MCP Streamable HTTP handler (Phase 3) |
| **API** | API Gateway v2 | HTTP API | REST endpoints + MCP endpoint |
| | API Gateway v2 | Cognito Authorizer | Validates Cognito JWT on API routes |
| **Auth** | Cognito | User Pool | Self-signup, email verification, password policies |
| | Cognito | User Pool Client | Frontend app client (SRP auth flow) |
| | Cognito | Post-Confirmation Trigger | Lambda to provision tenant on signup |
| **Database** | DynamoDB | CloudCorrect-Main | Tenants, users, accounts, groups, checks |
| | DynamoDB | CloudCorrect-Evaluations | Evaluation runs + check result logs |
| **Scheduling** | EventBridge | Scheduler rule (1-min) | Triggers scheduler-tick Lambda |
| | SQS | evaluation-queue | Fan-out: one message per group to evaluate |
| | SQS | evaluation-dlq | Dead letter queue for failed evaluations |
| **Notifications** | SES | Sender identity | Alert emails on check failures |
| **Frontend** | CloudFront | Distribution | CDN for Next.js app |
| | S3 | Assets bucket | Static assets (managed by SST Nextjs) |
| | Lambda@Edge | SSR functions | Server-side rendering (managed by OpenNext) |
| **Security** | IAM | Lambda execution roles | Auto-managed by SST per function |
| | IAM | Cross-account roles | STS AssumeRole for check evaluation |
| | Secrets Manager | JWT_SECRET | Signing key (if needed for API keys) |
| | Secrets Manager | SES_SENDER_EMAIL | Alert sender address |
| **Observability** | CloudWatch | Logs | Lambda function logs (auto) |
| | CloudWatch | Alarms | DLQ depth, Lambda errors, eval failure rate |

**Total: ~20 Lambda functions, 2 DynamoDB tables, 1 API Gateway, 1 Cognito User Pool, 1 EventBridge rule, 2 SQS queues, 1 CloudFront distribution**

**No VPC required** — all services communicate via AWS API endpoints.

---

## Phase 1: SST v4 Foundation & API Migration

**Goal:** Replace Docker Compose backend with SST v4 serverless infrastructure with feature parity.

### 1.1 SST v4 Project Setup
- [ ] Initialize SST v4 project in repo root (`sst.config.ts`)
- [ ] Set up pnpm workspaces (`packages/core`, `packages/functions`, `packages/frontend`)
- [ ] Configure deployment stages (dev, prod)
- [ ] Set up `sst dev` for local development experience
- [ ] Configure secrets via `sst secret` (SES_SENDER_EMAIL)

### 1.2 Auth — Cognito User Pools
- [ ] Provision Cognito User Pool via SST (`infra/auth.ts`)
  - Self-signup enabled
  - Email verification required
  - Password policy (min 8 chars, mixed case, numbers)
- [ ] Create User Pool Client (SRP auth flow, no client secret)
- [ ] Create Post-Confirmation Lambda trigger:
  - Generate tenantId (UUID)
  - Write Tenant item to DynamoDB
  - Write User item with cognitoSub mapping
- [ ] Update frontend auth:
  - Replace localStorage JWT with `@aws-amplify/auth` or `amazon-cognito-identity-js`
  - Signup → Cognito signUp + confirm (email code)
  - Login → Cognito signIn → get ID token
  - API calls → Authorization header with Cognito ID token
- [ ] Configure Cognito Authorizer on API Gateway

### 1.3 Database — DynamoDB
- [ ] Provision DynamoDB tables via SST (`infra/database.ts`):
  - `CloudCorrect-Main` (PK: `pk`, SK: `sk`, GSI1, GSI2)
  - `CloudCorrect-Evaluations` (PK: `pk`, SK: `sk`)
  - On-demand billing (pay per request)
- [ ] Create `packages/core/src/dynamo/` client layer:
  - DynamoDB DocumentClient with SST resource linking
  - Entity helpers: `putTenant()`, `getUser()`, `listGroups()`, etc.
  - Type-safe key builders: `tenantPK(id)`, `groupSK(id)`, etc.
- [ ] Migrate Sequelize models to DynamoDB entity types in `packages/core/src/types/`

### 1.4 API Gateway + Lambda Functions
- [ ] Create API Gateway v2 (HTTP API) via SST (`infra/api.ts`)
- [ ] Cognito Authorizer attached to all `/api/*` routes
- [ ] Migrate Express routes to Lambda handlers in `packages/functions/src/`:
  - **Auth** (unauthenticated, Cognito handles):
    - `GET /api/auth/me` → reads Cognito claims + DynamoDB user
  - **AWS Accounts**:
    - `POST /api/aws-accounts` → `accounts/create.ts`
    - `GET /api/aws-accounts` → `accounts/list.ts` (tenantId from Cognito claims)
    - `GET /api/aws-accounts/:id/analytics` → `accounts/analytics.ts`
  - **Invariant Groups**:
    - `POST /api/invariant-groups` → `groups/create.ts`
    - `GET /api/invariant-groups` → `groups/list.ts`
    - `GET /api/invariant-groups/:id` → `groups/detail.ts`
    - `PATCH /api/invariant-groups/:id` → `groups/update.ts`
    - `PATCH /api/invariant-groups/:id/toggle` → `groups/toggle.ts`
    - `GET /api/invariant-groups/:id/history` → `groups/history.ts`
    - `POST /api/invariant-groups/:id/evaluate` → `groups/evaluate.ts`
  - **Checks**:
    - `POST /api/invariant-groups/:id/checks` → `checks/create.ts`
    - `PATCH /api/invariant-groups/:gid/checks/:cid` → `checks/update.ts`
    - `DELETE /api/invariant-groups/:gid/checks/:cid` → `checks/delete.ts`
- [ ] Extract tenantId from Cognito JWT claims (custom attribute or post-confirm mapping)
- [ ] Port business logic from `backend/src/services/` → `packages/core/src/services/`
- [ ] Port AWS adapter from `backend/src/adapters/` → `packages/core/src/adapters/`

### 1.5 Scheduler Migration
- [ ] EventBridge Scheduler rule (1-minute) → invokes `scheduler/tick.ts`
- [ ] Tick Lambda:
  - Query GSI2: `PK = "ENABLED" AND SK <= "NEXT_RUN#<now>"`
  - Send SQS message per group: `{ tenantId, groupId }`
  - Update `nextRunAt` on each group item
- [ ] SQS queue (`evaluation-queue`) + DLQ (`evaluation-dlq`)
- [ ] Evaluate Lambda (`scheduler/evaluate.ts`):
  - SQS consumer (batch size 1)
  - Load group + checks from DynamoDB
  - Run evaluation engine
  - Write EvaluationRun + CheckResultLogs to evaluations table
  - Update group lastStatus/lastEvaluatedAt
  - Dispatch SES alert if status changed or failed
- [ ] Port `evaluationService.ts` → `packages/core/src/services/evaluation.ts`
- [ ] Port `alertService.ts` → `packages/core/src/services/alert.ts`

### 1.6 Frontend Deployment
- [ ] Move `frontend/` → `packages/frontend/`
- [ ] Deploy via SST `Nextjs` construct (`infra/frontend.ts`)
  - CloudFront distribution (no custom domain)
  - API URL linked via SST resource binding → `NEXT_PUBLIC_API_URL`
  - Cognito User Pool ID + Client ID linked for frontend auth
- [ ] Update frontend API client:
  - Replace Axios JWT interceptor with Cognito token retrieval
  - Auto-refresh tokens via Cognito SDK
- [ ] Update AuthContext to use Cognito auth state

### Proposed Directory Structure
```
cloudcorrect/
├── sst.config.ts                 # SST v4 configuration
├── sst-env.d.ts                  # SST type definitions
├── pnpm-workspace.yaml           # Workspace config
├── package.json                  # Root package.json
├── infra/                        # SST infrastructure definitions
│   ├── auth.ts                   # Cognito User Pool + triggers
│   ├── database.ts               # DynamoDB tables + GSIs
│   ├── api.ts                    # API Gateway + Lambda routes + authorizer
│   ├── scheduler.ts              # EventBridge + SQS + evaluate Lambda
│   ├── frontend.ts               # Next.js (CloudFront + S3)
│   └── mcp.ts                    # MCP server infra (Phase 3)
├── packages/
│   ├── core/                     # Shared business logic & data layer
│   │   ├── src/
│   │   │   ├── dynamo/           # DynamoDB client, key builders, entity helpers
│   │   │   │   ├── client.ts     # DocumentClient with resource linking
│   │   │   │   ├── keys.ts       # PK/SK builder functions
│   │   │   │   ├── tenants.ts    # Tenant CRUD operations
│   │   │   │   ├── users.ts      # User operations
│   │   │   │   ├── accounts.ts   # AWS account operations
│   │   │   │   ├── groups.ts     # Invariant group operations
│   │   │   │   ├── checks.ts     # Check operations
│   │   │   │   └── evaluations.ts # Evaluation run + result operations
│   │   │   ├── services/         # Business logic
│   │   │   │   ├── evaluation.ts # Check evaluation engine (from evaluationService.ts)
│   │   │   │   ├── alert.ts      # SES alert dispatch
│   │   │   │   └── aws-adapter.ts # AWS SDK client factory (STS AssumeRole)
│   │   │   └── types/            # Shared TypeScript types
│   │   │       ├── entities.ts   # DynamoDB entity types
│   │   │       ├── checks.ts     # Service/check type enums
│   │   │       └── api.ts        # API request/response types
│   │   └── package.json
│   ├── functions/                # Lambda handlers (thin wrappers)
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   │   ├── me.ts
│   │   │   │   └── post-confirm.ts   # Cognito trigger
│   │   │   ├── accounts/
│   │   │   │   ├── create.ts
│   │   │   │   ├── list.ts
│   │   │   │   └── analytics.ts
│   │   │   ├── groups/
│   │   │   │   ├── create.ts
│   │   │   │   ├── list.ts
│   │   │   │   ├── detail.ts
│   │   │   │   ├── update.ts
│   │   │   │   ├── toggle.ts
│   │   │   │   ├── history.ts
│   │   │   │   └── evaluate.ts
│   │   │   ├── checks/
│   │   │   │   ├── create.ts
│   │   │   │   ├── update.ts
│   │   │   │   └── delete.ts
│   │   │   ├── scheduler/
│   │   │   │   ├── tick.ts           # EventBridge → SQS fan-out
│   │   │   │   └── evaluate.ts       # SQS consumer → run checks
│   │   │   └── mcp/
│   │   │       └── server.ts         # MCP handler (Phase 3)
│   │   └── package.json
│   └── frontend/                 # Next.js app (moved from frontend/)
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── contexts/
│       │   ├── hooks/
│       │   └── lib/
│       └── package.json
└── docs/
```

---

## Phase 2: Enhanced Platform Features

**Goal:** Add capabilities that serverless architecture enables.

### 2.1 Real-Time Updates
- [ ] Add WebSocket API (API Gateway v2 WebSocket) via SST
- [ ] Push evaluation results to connected frontends in real-time
- [ ] Replace polling with WebSocket subscriptions on group detail page

### 2.2 Multi-Region Evaluation
- [ ] Fan-out checks by region to parallel Lambda invocations
- [ ] Reduce evaluation latency for groups spanning multiple regions

### 2.3 Evaluation Pipeline with Step Functions
- [ ] Model evaluation as a Step Function state machine:
  1. Load group + checks
  2. Fan-out: parallel check evaluation (Map state)
  3. Aggregate results
  4. Write to DB
  5. Conditionally alert
- [ ] Benefits: built-in retries, timeouts, visual debugging, execution history

### 2.4 Observability
- [ ] Structured logging (powertools-lambda)
- [ ] CloudWatch dashboards for evaluation success rates, latency, Lambda errors
- [ ] X-Ray tracing for end-to-end evaluation pipeline
- [ ] Alarm on elevated failure rates

### 2.5 API Enhancements
- [ ] Add API key-based access for programmatic/CI-CD usage
- [ ] Usage plans + throttling via API Gateway
- [ ] OpenAPI spec generation from Lambda handlers

---

## Phase 3: MCP Server Integration

**Goal:** Expose CloudCorrect's capabilities to AI agents via the Model Context Protocol.

### 3.1 MCP Server Core
- [ ] Implement MCP server as a Lambda function (Streamable HTTP transport)
- [ ] API key auth (from Phase 2.5) for MCP requests, scoped to tenant
- [ ] Register MCP server metadata (name, version, capabilities)

### 3.2 MCP Tools (Actions AI agents can invoke)
- [ ] **list_aws_accounts** — List connected AWS accounts for the tenant
- [ ] **list_groups** — List invariant groups with status summary
- [ ] **get_group_detail** — Full group detail with checks and last status
- [ ] **create_group** — Create a new invariant group with checks
- [ ] **evaluate_group** — Trigger immediate evaluation, return results
- [ ] **get_evaluation_history** — Paginated history for a group
- [ ] **create_check** — Add a check to an existing group
- [ ] **update_check** — Modify a check's parameters or operator
- [ ] **toggle_group** — Enable/disable monitoring for a group
- [ ] **get_check_types** — List available services, check types, and parameters
- [ ] **apply_template** — Apply a pre-built template to a group
- [ ] **get_dashboard_summary** — Overall health across all accounts/groups

### 3.3 MCP Resources (Data AI agents can read)
- [ ] `cloudcorrect://accounts` — Connected AWS accounts
- [ ] `cloudcorrect://groups` — All invariant groups with status
- [ ] `cloudcorrect://groups/{id}` — Group detail + checks
- [ ] `cloudcorrect://groups/{id}/history` — Evaluation history
- [ ] `cloudcorrect://templates` — Available check templates
- [ ] `cloudcorrect://check-types` — Service/check type reference

### 3.4 MCP Prompts (Guided interactions)
- [ ] **setup_monitoring** — "I want to monitor [service] for [scenario]" → guided check creation
- [ ] **investigate_failure** — "Why is group X failing?" → fetches history, analyzes patterns
- [ ] **compliance_report** — "Generate a compliance report for [account]" → aggregates evidence

---

## Phase 4: Advanced Features (Future)

### 4.1 Multi-Cloud Support
- [ ] Abstract AWS adapter into a provider interface
- [ ] Add GCP and Azure adapters
- [ ] Extend check types for GCP/Azure services

### 4.2 Policy-as-Code
- [ ] Allow defining checks via YAML/JSON policy files
- [ ] Git-synced policies (GitOps for compliance)
- [ ] Versioned policy history

### 4.3 Team Collaboration
- [ ] Role-based access control (Admin, Editor, Viewer)
- [ ] Team workspaces within a tenant
- [ ] Audit log for who created/modified checks

### 4.4 Marketplace
- [ ] Community-shared check templates
- [ ] Industry-specific compliance packs (SOC2, HIPAA, PCI-DSS)

### 4.5 Slack/PagerDuty Integration
- [ ] Alert channels beyond email
- [ ] Slack bot for check status and quick actions
- [ ] PagerDuty incident creation on critical failures

---

## Migration Sequence (Recommended)

```
Current (Docker Compose)
    │
    ├─ Phase 1.1: SST project setup + pnpm workspaces
    ├─ Phase 1.2: Cognito User Pool + post-confirm trigger
    ├─ Phase 1.3: DynamoDB tables + core data layer
    ├─ Phase 1.4: API Gateway + Lambda handlers
    ├─ Phase 1.5: Scheduler (EventBridge + SQS)
    ├─ Phase 1.6: Frontend (SST Nextjs, CloudFront)
    │   └─ ✅ Feature parity with Docker Compose
    │
    ├─ Phase 2.4: Observability (before adding complexity)
    ├─ Phase 2.5: API keys (prerequisite for MCP)
    ├─ Phase 3.1-3.4: MCP Server
    │   └─ ✅ AI-agent integration surface
    │
    ├─ Phase 2.1: Real-time (WebSocket)
    ├─ Phase 2.3: Step Functions pipeline
    │   └─ ✅ Production-ready platform
    │
    └─ Phase 4: Multi-cloud, Policy-as-Code, Marketplace
        └─ ✅ Platform expansion
```
