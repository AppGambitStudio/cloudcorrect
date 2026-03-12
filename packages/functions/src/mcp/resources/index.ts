import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  listAccountsByTenant,
  listGroupsByTenant,
  getGroup,
  listChecksByGroup,
  listRunsByGroup,
} from "@cloudcorrect/core";

// ─── Static data for templates resource ──────────────────────────────────────

const CHECK_TEMPLATES = [
  {
    id: "security-baseline",
    name: "Security Baseline",
    description:
      "Essential security checks for AWS accounts including S3 public access, RDS encryption, and IAM role verification.",
    category: "Security",
    checks: [
      { service: "S3", type: "S3_BUCKET_PUBLIC_ACCESS_BLOCKED", name: "S3 Bucket Public Access Blocked" },
      { service: "RDS", type: "RDS_PUBLIC_ACCESS_DISABLED", name: "RDS Public Access Disabled" },
      { service: "RDS", type: "RDS_ENCRYPTION_ENABLED", name: "RDS Encryption Enabled" },
      { service: "IAM", type: "ROLE_EXISTS", name: "IAM Role Exists" },
      { service: "EC2", type: "DEFAULT_VPC", name: "No Default VPC", operator: "EQUALS", expectedValue: 0 },
    ],
  },
  {
    id: "web-app-monitoring",
    name: "Web App Monitoring",
    description:
      "Monitor web application health including HTTP endpoints, load balancer targets, and ECS services.",
    category: "Monitoring",
    checks: [
      { service: "NETWORK", type: "HTTP_200", name: "HTTP Health Check" },
      { service: "ALB", type: "TARGET_GROUP_HEALTHY", name: "ALB Target Group Healthy" },
      { service: "ECS", type: "ECS_SERVICE_RUNNING", name: "ECS Service Running", operator: "GREATER_THAN_OR_EQUALS", expectedValue: 2 },
      { service: "CloudFront", type: "DISTRIBUTION_ENABLED", name: "CloudFront Distribution Enabled" },
    ],
  },
  {
    id: "database-protection",
    name: "Database Protection",
    description:
      "Comprehensive database monitoring for RDS and DynamoDB including availability, encryption, and backup verification.",
    category: "Database",
    checks: [
      { service: "RDS", type: "RDS_INSTANCE_AVAILABLE", name: "RDS Instance Available" },
      { service: "RDS", type: "RDS_ENCRYPTION_ENABLED", name: "RDS Encryption Enabled" },
      { service: "RDS", type: "RDS_PUBLIC_ACCESS_DISABLED", name: "RDS Public Access Disabled" },
      { service: "DynamoDB", type: "TABLE_STATUS_ACTIVE", name: "DynamoDB Table Active" },
      { service: "DynamoDB", type: "POINT_IN_TIME_RECOVERY_ENABLED", name: "DynamoDB PITR Enabled" },
      { service: "DynamoDB", type: "ENCRYPTION_ENABLED", name: "DynamoDB Encryption Enabled" },
    ],
  },
  {
    id: "dns-monitoring",
    name: "DNS Monitoring",
    description:
      "Monitor DNS configurations including record existence, values, and TTL settings for critical domains.",
    category: "Networking",
    checks: [
      { service: "Route53", type: "RECORD_EXISTS", name: "DNS Record Exists" },
      { service: "Route53", type: "DNS_POINTS_TO", name: "DNS Points To Expected Value", operator: "EQUALS" },
      { service: "Route53", type: "TTL_EQUALS", name: "DNS TTL Check" },
      { service: "NETWORK", type: "HTTP_200", name: "Domain HTTP Check" },
    ],
  },
];

// ─── Static data for check-types resource ────────────────────────────────────

const CHECK_TYPES = [
  {
    service: "EC2",
    name: "EC2 Instances",
    description: "Monitor instance states, network configurations, and security group assignments.",
    categories: ["compute"],
    checkTypes: [
      { id: "INSTANCE_RUNNING", name: "Instance is Running", description: "Verifies that a specific EC2 instance is in the running state.", supportsOperator: false },
      { id: "INSTANCE_HAS_PUBLIC_IP", name: "Instance has Public IP", description: "Checks if a specific EC2 instance has a public IP address assigned.", supportsOperator: false },
      { id: "HAS_PUBLIC_IP", name: "Has Public IP", description: "Generic check for public IP availability on an instance.", supportsOperator: false },
      { id: "IN_SECURITY_GROUP", name: "In Security Group", description: "Verifies that an EC2 instance belongs to a specific security group.", supportsOperator: false },
      { id: "IN_SUBNET", name: "In Subnet", description: "Checks if an EC2 instance is deployed in a specific subnet.", supportsOperator: false },
      { id: "DEFAULT_VPC", name: "Default VPC", description: "Checks for the presence of default VPCs in your account.", supportsOperator: true },
      { id: "RUNNING_INSTANCE_COUNT", name: "Running Instance Count", description: "Counts the number of currently running EC2 instances.", supportsOperator: true },
      { id: "INSTANCE_COUNT", name: "Instance Count", description: "Counts total EC2 instances regardless of state.", supportsOperator: true },
    ],
  },
  {
    service: "ALB",
    name: "Load Balancers (ALB)",
    description: "Monitor target health and listener configurations for Application Load Balancers.",
    categories: ["networking", "compute"],
    checkTypes: [
      { id: "TARGET_GROUP_HEALTHY", name: "Target Group Healthy", description: "Verifies that a target group has healthy targets meeting the minimum threshold.", supportsOperator: false },
      { id: "TARGET_GROUP_HEALTHY_COUNT", name: "Target Group Healthy Count", description: "Counts healthy targets in a target group.", supportsOperator: true },
      { id: "ALB_LISTENER_EXISTS", name: "Listener Exists", description: "Verifies that a specific listener port is configured on the load balancer.", supportsOperator: false },
    ],
  },
  {
    service: "Route53",
    name: "Route 53 DNS",
    description: "Monitor DNS records, verify configurations, and track TTL settings.",
    categories: ["networking"],
    checkTypes: [
      { id: "DNS_POINTS_TO", name: "DNS Points To", description: "Verifies that a DNS record resolves to the expected value.", supportsOperator: true },
      { id: "RECORD_EXISTS", name: "Record Exists", description: "Checks if a DNS record exists in the specified hosted zone.", supportsOperator: false },
      { id: "TTL_EQUALS", name: "TTL Equals", description: "Verifies a DNS record TTL matches the expected value.", supportsOperator: false },
    ],
  },
  {
    service: "IAM",
    name: "IAM",
    description: "Monitor IAM roles, policies, and access configurations.",
    categories: ["security"],
    checkTypes: [
      { id: "ROLE_EXISTS", name: "Role Exists", description: "Checks if an IAM role exists.", supportsOperator: false },
      { id: "ROLE_HAS_POLICY", name: "Role Has Policy", description: "Verifies an IAM role has a specific policy attached.", supportsOperator: false },
      { id: "POLICY_ATTACHED_TO_RESOURCE", name: "Policy Attached to Resource", description: "Checks if a policy is attached to a given resource.", supportsOperator: false },
    ],
  },
  {
    service: "S3",
    name: "S3",
    description: "Monitor S3 bucket configurations, policies, encryption, and object counts.",
    categories: ["storage"],
    checkTypes: [
      { id: "S3_BUCKET_EXISTS", name: "Bucket Exists", description: "Checks if an S3 bucket exists.", supportsOperator: false },
      { id: "S3_BUCKET_POLICY_PRESENT", name: "Bucket Policy Present", description: "Verifies a bucket has a policy attached.", supportsOperator: false },
      { id: "S3_BUCKET_PUBLIC_ACCESS_BLOCKED", name: "Public Access Blocked", description: "Verifies public access is blocked on a bucket.", supportsOperator: false },
      { id: "S3_LIFECYCLE_CONFIGURED", name: "Lifecycle Configured", description: "Checks if lifecycle rules are configured.", supportsOperator: false },
      { id: "S3_OBJECT_EXISTS", name: "Object Exists", description: "Checks if a specific object exists in a bucket.", supportsOperator: false },
      { id: "S3_BUCKET_COUNT", name: "Bucket Count", description: "Counts S3 buckets.", supportsOperator: true },
      { id: "S3_OBJECT_COUNT", name: "Object Count", description: "Counts objects in a bucket.", supportsOperator: true },
    ],
  },
  {
    service: "NETWORK",
    name: "Network Checks",
    description: "HTTP health checks, response validation, and ping monitoring.",
    categories: ["networking"],
    checkTypes: [
      { id: "HTTP_200", name: "HTTP 200 Check", description: "Verifies a URL returns HTTP 200.", supportsOperator: false },
      { id: "HTTP_RESPONSE_CONTAINS", name: "HTTP Response Contains", description: "Checks if HTTP response body contains expected text.", supportsOperator: false },
      { id: "PING", name: "Ping", description: "Verifies a host is reachable via ping.", supportsOperator: false },
    ],
  },
  {
    service: "RDS",
    name: "RDS",
    description: "Monitor RDS instance availability, encryption, network, and public access settings.",
    categories: ["database"],
    checkTypes: [
      { id: "RDS_INSTANCE_AVAILABLE", name: "Instance Available", description: "Verifies an RDS instance is in available state.", supportsOperator: false },
      { id: "RDS_IN_SUBNET_GROUP", name: "In Subnet Group", description: "Checks if an RDS instance is in a specific subnet group.", supportsOperator: false },
      { id: "RDS_PUBLIC_ACCESS_DISABLED", name: "Public Access Disabled", description: "Verifies public access is disabled.", supportsOperator: false },
      { id: "RDS_ENCRYPTION_ENABLED", name: "Encryption Enabled", description: "Verifies encryption is enabled.", supportsOperator: false },
    ],
  },
  {
    service: "ECS",
    name: "ECS",
    description: "Monitor ECS services, task counts, task definitions, and cluster status.",
    categories: ["compute"],
    checkTypes: [
      { id: "ECS_SERVICE_RUNNING", name: "Service Running", description: "Verifies an ECS service is running with expected task count.", supportsOperator: true },
      { id: "ECS_SERVICE_RUNNING_COUNT_EQUALS_DESIRED", name: "Running Equals Desired", description: "Checks that running count equals desired count.", supportsOperator: false },
      { id: "ECS_RUNNING_TASK_COUNT", name: "Running Task Count", description: "Counts running tasks in a service.", supportsOperator: true },
      { id: "ECS_TASK_DEFINITION_REVISION_ACTIVE", name: "Task Definition Active", description: "Verifies a task definition revision is active.", supportsOperator: false },
      { id: "ECS_SERVICE_ATTACHED_TO_ALB", name: "Service Attached to ALB", description: "Checks if a service is attached to a load balancer.", supportsOperator: false },
      { id: "ECS_CLUSTER_ACTIVE", name: "Cluster Active", description: "Verifies an ECS cluster is active.", supportsOperator: false },
    ],
  },
  {
    service: "DynamoDB",
    name: "DynamoDB",
    description: "Monitor DynamoDB tables, encryption, backups, and billing configuration.",
    categories: ["database"],
    checkTypes: [
      { id: "TABLE_EXISTS", name: "Table Exists", description: "Checks if a table exists.", supportsOperator: false },
      { id: "TABLE_STATUS_ACTIVE", name: "Table Status Active", description: "Verifies a table is in active state.", supportsOperator: false },
      { id: "BILLING_MODE_MATCHES", name: "Billing Mode Matches", description: "Checks the billing mode of a table.", supportsOperator: false },
      { id: "POINT_IN_TIME_RECOVERY_ENABLED", name: "PITR Enabled", description: "Verifies point-in-time recovery is enabled.", supportsOperator: false },
      { id: "ENCRYPTION_ENABLED", name: "Encryption Enabled", description: "Verifies encryption is enabled.", supportsOperator: false },
      { id: "DELETION_PROTECTION_ENABLED", name: "Deletion Protection Enabled", description: "Checks if deletion protection is enabled.", supportsOperator: false },
    ],
  },
  {
    service: "Lambda",
    name: "Lambda",
    description: "Monitor Lambda function configurations, VPC settings, concurrency, and security.",
    categories: ["compute"],
    checkTypes: [
      { id: "VPC_CONFIGURED", name: "VPC Configured", description: "Checks if a Lambda function is configured with a VPC.", supportsOperator: false },
      { id: "RESERVED_CONCURRENCY_SET", name: "Reserved Concurrency Set", description: "Verifies reserved concurrency is configured.", supportsOperator: false },
      { id: "FUNCTION_URL_AUTH_TYPE", name: "Function URL Auth Type", description: "Checks the auth type of a function URL.", supportsOperator: false },
      { id: "ENVIRONMENT_VARIABLE_EXISTS", name: "Environment Variable Exists", description: "Checks if an environment variable exists.", supportsOperator: false },
      { id: "LAYER_ATTACHED", name: "Layer Attached", description: "Verifies a specific layer is attached.", supportsOperator: false },
      { id: "DEAD_LETTER_QUEUE_CONFIGURED", name: "DLQ Configured", description: "Checks if a dead letter queue is configured.", supportsOperator: false },
      { id: "LAMBDA_FUNCTION_COUNT", name: "Function Count", description: "Counts Lambda functions.", supportsOperator: true },
    ],
  },
  {
    service: "CloudFront",
    name: "CloudFront",
    description: "Monitor CloudFront distributions, origins, security, and WAF configurations.",
    categories: ["networking"],
    checkTypes: [
      { id: "DISTRIBUTION_EXISTS", name: "Distribution Exists", description: "Checks if a distribution exists.", supportsOperator: false },
      { id: "DISTRIBUTION_ENABLED", name: "Distribution Enabled", description: "Verifies a distribution is enabled.", supportsOperator: false },
      { id: "ORIGIN_EXISTS", name: "Origin Exists", description: "Checks if a specific origin is configured.", supportsOperator: false },
      { id: "DEFAULT_ROOT_OBJECT_SET", name: "Default Root Object Set", description: "Verifies a default root object is configured.", supportsOperator: false },
      { id: "VIEWER_PROTOCOL_HTTPS_ONLY", name: "HTTPS Only", description: "Checks viewer protocol is HTTPS only.", supportsOperator: false },
      { id: "WAF_ENABLED", name: "WAF Enabled", description: "Verifies WAF is enabled on the distribution.", supportsOperator: false },
      { id: "ORIGIN_ACCESS_CONTROL_CONFIGURED", name: "Origin Access Control", description: "Checks OAC is configured for S3 origins.", supportsOperator: false },
    ],
  },
  {
    service: "ConfigService",
    name: "AWS Config",
    description: "Monitor AWS Config recorder, rules, delivery channels, and compliance status.",
    categories: ["monitoring"],
    checkTypes: [
      { id: "CONFIG_RECORDER_ACTIVE", name: "Recorder Active", description: "Checks if the Config recorder is active.", supportsOperator: false },
      { id: "CONFIG_RULE_COMPLIANT", name: "Rule Compliant", description: "Verifies a Config rule is compliant.", supportsOperator: false },
      { id: "DELIVERY_CHANNEL_CONFIGURED", name: "Delivery Channel Configured", description: "Checks if a delivery channel is configured.", supportsOperator: false },
      { id: "RESOURCE_COMPLIANT", name: "Resource Compliant", description: "Checks if a specific resource is compliant.", supportsOperator: false },
      { id: "CONFORMANCE_PACK_COMPLIANT", name: "Conformance Pack Compliant", description: "Verifies a conformance pack is compliant.", supportsOperator: false },
      { id: "AGGREGATOR_CONFIGURED", name: "Aggregator Configured", description: "Checks if a Config aggregator is configured.", supportsOperator: false },
    ],
  },
];

// ─── Registration ────────────────────────────────────────────────────────────

export function registerResources(server: McpServer, tenantId: string) {
  // 1. cloudcorrect://accounts — list all connected AWS accounts
  server.resource(
    "accounts",
    "cloudcorrect://accounts",
    { description: "List of all connected AWS accounts for this tenant", mimeType: "application/json" },
    async (uri) => {
      const accounts = await listAccountsByTenant(tenantId);
      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(accounts, null, 2),
        }],
      };
    },
  );

  // 2. cloudcorrect://groups — list all invariant groups with status summary
  server.resource(
    "groups",
    "cloudcorrect://groups",
    { description: "List of all invariant groups with status summary", mimeType: "application/json" },
    async (uri) => {
      const groups = await listGroupsByTenant(tenantId);
      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(groups, null, 2),
        }],
      };
    },
  );

  // 3. cloudcorrect://groups/{groupId} — full group detail + checks
  server.resource(
    "group_detail",
    new ResourceTemplate("cloudcorrect://groups/{groupId}", { list: undefined }),
    { description: "Full group detail including all checks", mimeType: "application/json" },
    async (uri, { groupId }) => {
      const id = String(groupId);
      const [group, checks] = await Promise.all([
        getGroup(tenantId, id),
        listChecksByGroup(tenantId, id),
      ]);
      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify({ group, checks }, null, 2),
        }],
      };
    },
  );

  // 4. cloudcorrect://groups/{groupId}/history — last 20 evaluation runs
  server.resource(
    "group_history",
    new ResourceTemplate("cloudcorrect://groups/{groupId}/history", { list: undefined }),
    { description: "Last 20 evaluation runs for a group", mimeType: "application/json" },
    async (uri, { groupId }) => {
      const { items } = await listRunsByGroup(tenantId, String(groupId), { limit: 20 });
      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(items, null, 2),
        }],
      };
    },
  );

  // 5. cloudcorrect://templates — available check templates
  server.resource(
    "templates",
    "cloudcorrect://templates",
    { description: "Available check templates for quick setup", mimeType: "application/json" },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(CHECK_TEMPLATES, null, 2),
      }],
    }),
  );

  // 6. cloudcorrect://check-types — available AWS services and check types
  server.resource(
    "check_types",
    "cloudcorrect://check-types",
    { description: "Available AWS services and check types", mimeType: "application/json" },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(CHECK_TYPES, null, 2),
      }],
    }),
  );
}
