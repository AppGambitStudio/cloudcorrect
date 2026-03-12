# CloudCorrect

CloudCorrect is an architectural correctness platform for AWS. It continuously verifies that your cloud infrastructure matches your design intent — not by watching metrics, but by asserting structural invariants.

> Isn't this just monitoring?

> Not exactly. Monitoring tells you when something is noisy. CloudCorrect tells you when an architectural assumption is broken.

**Architectural Truth, Not Metric Noise.**

## Key Features

- **65+ Check Types across 12 AWS Services** — EC2, ALB, Route53, IAM, S3, RDS, ECS, DynamoDB, Lambda, CloudFront, Network, AWS Config
- **Continuous Architectural Auditing** — Define invariant groups and schedule automated evaluations on configurable intervals
- **Operator-Based Assertions** — EQUALS, GREATER_THAN, CONTAINS, IN_LIST, and more for flexible validation
- **AI-Native via MCP** — 12 tools, 6 resources, and 3 prompts exposed via Model Context Protocol for AI agent integration
- **Multi-Tenant & Cross-Account** — Tenant-isolated DynamoDB design with IAM cross-account role assumption
- **Evidence-Based History** — Every evaluation captures observed values, expected values, and failure reasons for audit trails
- **Fail-Fast Notifications** — Automated email alerts via SES on evaluation failures
- **Check Templates** — Pre-built templates for common architectures to get started quickly
- **Fully Serverless** — Scales to zero, no always-on infrastructure, pay-per-use

## Architecture

```
                        CloudFront CDN
                     (React SPA Frontend)
                             |
                    API Gateway v2 (HTTP)
                   /                      \
          Cognito JWT Auth          Lambda Authorizer
          (Web UI routes)           (API Key - MCP)
                |                         |
         Lambda Handlers            MCP Server Lambda
                |                         |
            DynamoDB (2 tables)           |
          Main + Evaluations             /
                |                       /
     +----------+---------+           /
     |                    |         /
EventBridge (1-min)    SQS Queue  /
     |                    |      /
Tick Lambda ---------> Evaluate Lambda ---> Target AWS Accounts
  (fan-out)            (SQS consumer)       (STS AssumeRole)
                            |
                        SES Alerts
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + Vite + Tailwind CSS v4 + shadcn/ui + Lucide Icons |
| **API** | API Gateway v2 + Lambda (Node.js 22, ARM64) |
| **Auth** | Cognito User Pools (self-signup, email verification) |
| **Database** | DynamoDB (2 tables, single-table design, tenant-first partition keys) |
| **Scheduler** | EventBridge (1-min rule) + SQS queue + DLQ |
| **AI Integration** | MCP Server (Streamable HTTP transport on Lambda) |
| **Notifications** | AWS SES |
| **IaC** | SST v4 (Ion) — TypeScript-native |
| **Monorepo** | pnpm workspaces |

## Project Structure

```
cloudcorrect/
├── sst.config.ts                 # SST v4 configuration
├── infra/                        # Infrastructure definitions
│   ├── auth.ts                   # Cognito User Pool + post-confirm trigger
│   ├── database.ts               # DynamoDB tables + GSIs
│   ├── api.ts                    # API Gateway + Lambda routes + authorizers
│   ├── scheduler.ts              # EventBridge + SQS + evaluate Lambda
│   ├── mcp.ts                    # MCP server routes
│   └── frontend.ts               # Static site (CloudFront + S3)
├── packages/
│   ├── core/                     # Shared business logic & data layer
│   │   └── src/
│   │       ├── dynamo/           # DynamoDB client, key builders, entity helpers
│   │       ├── services/         # Evaluation engine, alert service, AWS adapter
│   │       └── types/            # TypeScript types and check definitions
│   ├── functions/                # Lambda handlers
│   │   └── src/
│   │       ├── auth/             # /api/auth/me + post-confirm trigger
│   │       ├── accounts/         # AWS account CRUD
│   │       ├── groups/           # Invariant group CRUD + evaluate
│   │       ├── checks/           # Check CRUD
│   │       ├── apikeys/          # API key management
│   │       ├── scheduler/        # Tick (fan-out) + evaluate (SQS consumer)
│   │       └── mcp/              # MCP server, tools, resources, prompts
│   └── frontend/                 # React SPA
│       └── src/
│           ├── pages/            # Dashboard, Accounts, Groups, Integrations
│           ├── components/       # Sidebar, UI components (shadcn/ui)
│           ├── contexts/         # Auth, Confirm
│           └── lib/              # API client, check references, utilities
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v22+
- [pnpm](https://pnpm.io/) v9+
- [SST v4](https://sst.dev/) CLI
- AWS account with configured credentials

### Setup

```bash
# Install dependencies
pnpm install

# Configure AWS profile (adjust to your profile)
export AWS_PROFILE=your-profile
export AWS_DEFAULT_REGION=your-region

# Deploy to a dev stage
npx sst deploy --stage dev

# Or run in local dev mode
npx sst dev --stage dev
```

SST handles all infrastructure provisioning — Cognito, DynamoDB tables, API Gateway, Lambda functions, EventBridge scheduler, SQS queues, and CloudFront distribution.

### Environment

SST v4 uses resource linking — no `.env` files needed. Resource names (table names, queue URLs, Cognito pool IDs) are automatically injected into Lambda functions at deploy time via `Resource.*`.

The frontend receives its configuration through SST-linked environment variables:
- `VITE_API_URL` — API Gateway endpoint
- `VITE_USER_POOL_ID` — Cognito User Pool ID
- `VITE_USER_POOL_CLIENT_ID` — Cognito app client ID

## Supported Services & Check Types

| Service | Check Types | Examples |
|---------|------------|---------|
| **EC2** | 9 types | Instance running, public IP, security group, subnet, VPC, instance counts |
| **ALB** | 3 types | Target group healthy, healthy count, listener exists |
| **Route53** | 3 types | DNS points to, record exists, TTL equals |
| **IAM** | 3 types | Role exists, role has policy, policy attached |
| **S3** | 7 types | Bucket exists, public access blocked, lifecycle, object exists, counts |
| **Network** | 3 types | HTTP 200, response contains, ICMP ping |
| **RDS** | 4 types | Instance available, subnet group, public access disabled, encryption |
| **ECS** | 6 types | Service running, task counts, ALB attachment, cluster active |
| **DynamoDB** | 6 types | Table exists/active, billing mode, PITR, encryption, deletion protection |
| **Lambda** | 7 types | VPC configured, concurrency, DLQ, layers, env vars, function count |
| **CloudFront** | 7 types | Distribution exists/enabled, HTTPS only, WAF, origin access control |
| **AWS Config** | 6 types | Recorder active, rule compliant, conformance packs, aggregator |

**Operators:** EQUALS, NOT_EQUALS, CONTAINS, NOT_CONTAINS, GREATER_THAN, LESS_THAN, GREATER_THAN_OR_EQUALS, LESS_THAN_OR_EQUALS, IN_LIST, NOT_IN_LIST, IS_EMPTY, IS_NOT_EMPTY

## MCP Integration

CloudCorrect exposes a Model Context Protocol (MCP) server for AI agent integration. Connect Claude Desktop, Claude Code, or any MCP-compatible client.

### Connecting

1. Create an API key in the Integrations page
2. Add the MCP server to your client config:

```json
{
  "mcpServers": {
    "cloudcorrect": {
      "url": "https://<your-api-url>/mcp",
      "headers": {
        "x-api-key": "<your-api-key>"
      }
    }
  }
}
```

### Available MCP Capabilities

**12 Tools:** `list_aws_accounts`, `list_groups`, `get_group_detail`, `create_group`, `evaluate_group`, `get_evaluation_history`, `create_check`, `update_check`, `toggle_group`, `get_check_types`, `apply_template`, `get_dashboard_summary`

**6 Resources:** `cloudcorrect://accounts`, `cloudcorrect://groups`, `cloudcorrect://groups/{id}`, `cloudcorrect://groups/{id}/history`, `cloudcorrect://templates`, `cloudcorrect://check-types`

**3 Prompts:** `setup_monitoring`, `investigate_failure`, `compliance_report`

### Example Prompts

- *"Set up monitoring for our production RDS instances — check encryption, public access, and subnet placement"*
- *"Why is the web-tier group failing? Investigate the last 5 runs"*
- *"Generate a compliance report for all our AWS accounts"*

## API Routes

### Web UI (Cognito JWT auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/me` | Current user info |
| POST | `/api/aws-accounts` | Connect AWS account |
| GET | `/api/aws-accounts` | List AWS accounts |
| GET | `/api/aws-accounts/:id/analytics` | Account analytics |
| POST | `/api/invariant-groups` | Create group |
| GET | `/api/invariant-groups` | List groups |
| GET | `/api/invariant-groups/:id` | Group detail |
| PATCH | `/api/invariant-groups/:id` | Update group |
| PATCH | `/api/invariant-groups/:id/toggle` | Toggle enabled |
| GET | `/api/invariant-groups/:id/history` | Evaluation history |
| POST | `/api/invariant-groups/:id/evaluate` | Trigger evaluation |
| POST | `/api/invariant-groups/:id/checks` | Create check |
| PATCH | `/api/invariant-groups/:gid/checks/:cid` | Update check |
| DELETE | `/api/invariant-groups/:gid/checks/:cid` | Delete check |

### API Keys (Cognito JWT auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/api-keys` | Create API key |
| GET | `/api/api-keys` | List API keys |
| DELETE | `/api/api-keys/:id` | Revoke API key |

### MCP (API Key auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/mcp` | JSON-RPC requests |
| GET | `/mcp` | SSE streaming |
| DELETE | `/mcp` | Session cleanup |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Commercial Support

For cloud hosting, enterprise features, or custom development:

**Email**: [dhaval@appgambit.com](mailto:dhaval@appgambit.com)
