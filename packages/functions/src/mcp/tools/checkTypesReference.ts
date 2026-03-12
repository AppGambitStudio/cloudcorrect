/**
 * Simplified check types reference for MCP tool responses.
 * Derived from packages/frontend/src/lib/checksReference.ts
 */

export interface CheckTypeInfo {
  id: string;
  name: string;
  description: string;
  parameters: { name: string; type: string; required: boolean; description: string }[];
  supportsOperator: boolean;
  defaultOperator?: string;
}

export interface ServiceCheckTypes {
  service: string;
  name: string;
  description: string;
  checkTypes: CheckTypeInfo[];
}

export const CHECK_TYPES_REFERENCE: ServiceCheckTypes[] = [
  {
    service: "EC2",
    name: "EC2 Instances",
    description: "Monitor instance states, network configurations, and security group assignments.",
    checkTypes: [
      {
        id: "INSTANCE_RUNNING",
        name: "Instance is Running",
        description: "Verifies that a specific EC2 instance is in the running state.",
        parameters: [
          { name: "instanceId", type: "string", required: true, description: "EC2 instance ID (i-...)" },
        ],
        supportsOperator: false,
      },
      {
        id: "INSTANCE_HAS_PUBLIC_IP",
        name: "Instance has Public IP",
        description: "Checks if an EC2 instance has a public IP address assigned.",
        parameters: [
          { name: "instanceId", type: "string", required: true, description: "EC2 instance ID" },
        ],
        supportsOperator: false,
      },
      {
        id: "HAS_PUBLIC_IP",
        name: "Has Public IP",
        description: "Generic check for public IP availability on an instance.",
        parameters: [
          { name: "instanceId", type: "string", required: true, description: "EC2 instance ID" },
        ],
        supportsOperator: false,
      },
      {
        id: "IN_SECURITY_GROUP",
        name: "In Security Group",
        description: "Verifies that an EC2 instance belongs to a specific security group.",
        parameters: [
          { name: "securityGroupId", type: "string", required: true, description: "Security group ID (sg-...)" },
        ],
        supportsOperator: false,
      },
      {
        id: "IN_SUBNET",
        name: "In Subnet",
        description: "Checks if an EC2 instance is deployed in a specific subnet.",
        parameters: [
          { name: "subnetId", type: "string", required: true, description: "Subnet ID (subnet-...)" },
        ],
        supportsOperator: false,
      },
      {
        id: "DEFAULT_VPC",
        name: "Default VPC",
        description: "Checks for the presence of default VPCs in your account.",
        parameters: [
          { name: "expectedCount", type: "number", required: true, description: "Expected number of default VPCs (use 0 with EQUALS to ensure none exist)" },
        ],
        supportsOperator: true,
        defaultOperator: "EQUALS",
      },
      {
        id: "RUNNING_INSTANCE_COUNT",
        name: "Running Instance Count",
        description: "Counts running EC2 instances, optionally filtered by tags.",
        parameters: [
          { name: "expectedCount", type: "number", required: true, description: "Expected number of running instances" },
          { name: "tagKey", type: "string", required: false, description: "Filter by tag key" },
          { name: "tagValue", type: "string", required: false, description: "Filter by tag value" },
        ],
        supportsOperator: true,
        defaultOperator: "EQUALS",
      },
      {
        id: "INSTANCE_COUNT",
        name: "Instance Count",
        description: "Counts total EC2 instances regardless of state.",
        parameters: [
          { name: "expectedCount", type: "number", required: true, description: "Expected total instance count" },
          { name: "tagKey", type: "string", required: false, description: "Filter by tag key" },
          { name: "tagValue", type: "string", required: false, description: "Filter by tag value" },
        ],
        supportsOperator: true,
        defaultOperator: "EQUALS",
      },
    ],
  },
  {
    service: "ALB",
    name: "Load Balancers (ALB)",
    description: "Monitor target health and listener configurations.",
    checkTypes: [
      {
        id: "TARGET_GROUP_HEALTHY",
        name: "Target Group Healthy",
        description: "Verifies that a target group has healthy targets.",
        parameters: [
          { name: "targetGroupArn", type: "string", required: true, description: "Target group ARN" },
          { name: "expectedCount", type: "number", required: false, description: "Minimum healthy count" },
        ],
        supportsOperator: false,
      },
      {
        id: "TARGET_GROUP_HEALTHY_COUNT",
        name: "Target Group Healthy Count",
        description: "Counts healthy targets and compares against expected value.",
        parameters: [
          { name: "targetGroupArn", type: "string", required: true, description: "Target group ARN" },
          { name: "expectedCount", type: "number", required: true, description: "Expected healthy count" },
        ],
        supportsOperator: true,
        defaultOperator: "GREATER_THAN_OR_EQUALS",
      },
      {
        id: "ALB_LISTENER_EXISTS",
        name: "Listener Exists",
        description: "Verifies a listener port is configured on the load balancer.",
        parameters: [
          { name: "loadBalancerArn", type: "string", required: true, description: "ALB ARN" },
          { name: "listenerPort", type: "number", required: true, description: "Listener port (1-65535)" },
        ],
        supportsOperator: false,
      },
    ],
  },
  {
    service: "Route53",
    name: "Route 53 DNS",
    description: "Monitor DNS records, verify configurations, and track TTL settings.",
    checkTypes: [
      {
        id: "DNS_POINTS_TO",
        name: "DNS Points To",
        description: "Verifies that a DNS record resolves to the expected value.",
        parameters: [
          { name: "recordName", type: "string", required: true, description: "Fully qualified domain name" },
          { name: "expectedValue", type: "string", required: true, description: "Expected DNS value" },
          { name: "hostedZoneId", type: "string", required: true, description: "Route 53 hosted zone ID" },
        ],
        supportsOperator: true,
        defaultOperator: "EQUALS",
      },
      {
        id: "RECORD_EXISTS",
        name: "Record Exists",
        description: "Checks if a DNS record exists in the specified hosted zone.",
        parameters: [
          { name: "recordName", type: "string", required: true, description: "DNS record name" },
          { name: "hostedZoneId", type: "string", required: true, description: "Route 53 hosted zone ID" },
        ],
        supportsOperator: false,
      },
      {
        id: "TTL_EQUALS",
        name: "TTL Equals",
        description: "Verifies that a DNS record has the expected TTL value.",
        parameters: [
          { name: "recordName", type: "string", required: true, description: "DNS record name" },
          { name: "expectedTtl", type: "number", required: true, description: "Expected TTL in seconds" },
          { name: "hostedZoneId", type: "string", required: true, description: "Route 53 hosted zone ID" },
        ],
        supportsOperator: false,
      },
    ],
  },
  {
    service: "IAM",
    name: "IAM Security",
    description: "Verify roles, policies, and permission configurations.",
    checkTypes: [
      {
        id: "ROLE_EXISTS",
        name: "Role Exists",
        description: "Verifies that a specific IAM role exists.",
        parameters: [
          { name: "roleName", type: "string", required: true, description: "IAM role name" },
        ],
        supportsOperator: false,
      },
      {
        id: "ROLE_HAS_POLICY",
        name: "Role Has Policy",
        description: "Checks if an IAM role has a specific policy attached.",
        parameters: [
          { name: "roleName", type: "string", required: true, description: "IAM role name" },
          { name: "policyArn", type: "string", required: true, description: "Policy ARN" },
        ],
        supportsOperator: false,
      },
      {
        id: "POLICY_ATTACHED_TO_RESOURCE",
        name: "Policy Attached to Resource",
        description: "Verifies that a policy is attached to a specific IAM resource.",
        parameters: [
          { name: "roleName", type: "string", required: true, description: "IAM role name" },
          { name: "policyArn", type: "string", required: true, description: "Policy ARN" },
        ],
        supportsOperator: false,
      },
    ],
  },
  {
    service: "S3",
    name: "S3 Storage",
    description: "Monitor bucket configurations, security settings, and object presence.",
    checkTypes: [
      {
        id: "S3_BUCKET_EXISTS",
        name: "Bucket Exists",
        description: "Verifies that an S3 bucket exists and is accessible.",
        parameters: [
          { name: "bucketName", type: "string", required: true, description: "S3 bucket name" },
        ],
        supportsOperator: false,
      },
      {
        id: "S3_BUCKET_POLICY_PRESENT",
        name: "Policy Present",
        description: "Checks if an S3 bucket has a bucket policy configured.",
        parameters: [
          { name: "bucketName", type: "string", required: true, description: "S3 bucket name" },
        ],
        supportsOperator: false,
      },
      {
        id: "S3_BUCKET_PUBLIC_ACCESS_BLOCKED",
        name: "Public Access Blocked",
        description: "Verifies that public access is blocked on an S3 bucket.",
        parameters: [
          { name: "bucketName", type: "string", required: true, description: "S3 bucket name" },
        ],
        supportsOperator: false,
      },
      {
        id: "S3_LIFECYCLE_CONFIGURED",
        name: "Lifecycle Configured",
        description: "Checks if an S3 bucket has lifecycle rules configured.",
        parameters: [
          { name: "bucketName", type: "string", required: true, description: "S3 bucket name" },
        ],
        supportsOperator: false,
      },
      {
        id: "S3_OBJECT_EXISTS",
        name: "Object Exists",
        description: "Verifies that a specific object exists in an S3 bucket.",
        parameters: [
          { name: "bucketName", type: "string", required: true, description: "S3 bucket name" },
          { name: "objectKey", type: "string", required: true, description: "Object key (path)" },
        ],
        supportsOperator: false,
      },
      {
        id: "S3_BUCKET_COUNT",
        name: "Bucket Count",
        description: "Counts S3 buckets, optionally filtered by name prefix.",
        parameters: [
          { name: "expectedCount", type: "number", required: true, description: "Expected bucket count" },
          { name: "namePrefix", type: "string", required: false, description: "Filter by name prefix" },
        ],
        supportsOperator: true,
        defaultOperator: "EQUALS",
      },
      {
        id: "S3_OBJECT_COUNT",
        name: "Object Count",
        description: "Counts objects in an S3 bucket, optionally filtered by prefix.",
        parameters: [
          { name: "bucketName", type: "string", required: true, description: "S3 bucket name" },
          { name: "expectedCount", type: "number", required: true, description: "Expected object count" },
          { name: "prefix", type: "string", required: false, description: "Object key prefix filter" },
        ],
        supportsOperator: true,
        defaultOperator: "EQUALS",
      },
    ],
  },
  {
    service: "NETWORK",
    name: "Network Health",
    description: "External network connectivity checks including HTTP endpoints and ICMP ping.",
    checkTypes: [
      {
        id: "HTTP_200",
        name: "HTTP 200 OK",
        description: "Verifies that a URL returns HTTP 200.",
        parameters: [
          { name: "url", type: "string", required: true, description: "URL to check (include https://)" },
        ],
        supportsOperator: false,
      },
      {
        id: "HTTP_RESPONSE_CONTAINS",
        name: "HTTP Response Contains",
        description: "Checks if an HTTP response body contains a specific substring.",
        parameters: [
          { name: "url", type: "string", required: true, description: "URL to fetch" },
          { name: "expectedSubstring", type: "string", required: true, description: "Text that must be in the response" },
        ],
        supportsOperator: false,
      },
      {
        id: "PING",
        name: "ICMP Ping",
        description: "Performs an ICMP ping to verify host reachability.",
        parameters: [
          { name: "target", type: "string", required: true, description: "IP address or hostname" },
        ],
        supportsOperator: false,
      },
    ],
  },
  {
    service: "RDS",
    name: "RDS Database",
    description: "Monitor instance availability, security settings, and network configurations.",
    checkTypes: [
      {
        id: "RDS_INSTANCE_AVAILABLE",
        name: "Instance Available",
        description: "Verifies that an RDS instance is in the available state.",
        parameters: [
          { name: "dbInstanceIdentifier", type: "string", required: true, description: "RDS instance identifier" },
        ],
        supportsOperator: false,
      },
      {
        id: "RDS_IN_SUBNET_GROUP",
        name: "In Subnet Group",
        description: "Checks if an RDS instance is in the specified subnet group.",
        parameters: [
          { name: "dbInstanceIdentifier", type: "string", required: true, description: "RDS instance identifier" },
          { name: "subnetGroupName", type: "string", required: true, description: "Expected subnet group name" },
        ],
        supportsOperator: false,
      },
      {
        id: "RDS_PUBLIC_ACCESS_DISABLED",
        name: "Public Access Disabled",
        description: "Verifies that an RDS instance does not have public accessibility.",
        parameters: [
          { name: "dbInstanceIdentifier", type: "string", required: true, description: "RDS instance identifier" },
        ],
        supportsOperator: false,
      },
      {
        id: "RDS_ENCRYPTION_ENABLED",
        name: "Encryption Enabled",
        description: "Checks if an RDS instance has storage encryption enabled.",
        parameters: [
          { name: "dbInstanceIdentifier", type: "string", required: true, description: "RDS instance identifier" },
        ],
        supportsOperator: false,
      },
    ],
  },
  {
    service: "ECS",
    name: "ECS Container Service",
    description: "Monitor service health, task counts, and cluster status.",
    checkTypes: [
      {
        id: "ECS_SERVICE_RUNNING",
        name: "Running (Sufficient)",
        description: "Verifies that an ECS service has running tasks meeting expected count.",
        parameters: [
          { name: "clusterName", type: "string", required: true, description: "ECS cluster name" },
          { name: "serviceName", type: "string", required: true, description: "ECS service name" },
          { name: "expectedCount", type: "number", required: false, description: "Expected running task count" },
        ],
        supportsOperator: true,
        defaultOperator: "GREATER_THAN_OR_EQUALS",
      },
      {
        id: "ECS_SERVICE_RUNNING_COUNT_EQUALS_DESIRED",
        name: "Running (Exact)",
        description: "Verifies running task count matches desired count.",
        parameters: [
          { name: "clusterName", type: "string", required: true, description: "ECS cluster name" },
          { name: "serviceName", type: "string", required: true, description: "ECS service name" },
          { name: "expectedCount", type: "number", required: false, description: "Expected count" },
        ],
        supportsOperator: true,
        defaultOperator: "EQUALS",
      },
      {
        id: "ECS_RUNNING_TASK_COUNT",
        name: "Running Task Count",
        description: "Counts running tasks and compares against expected value.",
        parameters: [
          { name: "clusterName", type: "string", required: true, description: "ECS cluster name" },
          { name: "serviceName", type: "string", required: true, description: "ECS service name" },
          { name: "expectedCount", type: "number", required: true, description: "Expected task count" },
        ],
        supportsOperator: true,
        defaultOperator: "EQUALS",
      },
      {
        id: "ECS_TASK_DEFINITION_REVISION_ACTIVE",
        name: "Task Def Revision Active",
        description: "Verifies a service is running a specific task definition revision.",
        parameters: [
          { name: "clusterName", type: "string", required: true, description: "ECS cluster name" },
          { name: "serviceName", type: "string", required: true, description: "ECS service name" },
          { name: "expectedTaskDefinition", type: "string", required: true, description: "Task definition ARN or family:revision" },
        ],
        supportsOperator: false,
      },
      {
        id: "ECS_SERVICE_ATTACHED_TO_ALB",
        name: "Attached to ALB",
        description: "Checks if an ECS service is attached to a load balancer.",
        parameters: [
          { name: "clusterName", type: "string", required: true, description: "ECS cluster name" },
          { name: "serviceName", type: "string", required: true, description: "ECS service name" },
        ],
        supportsOperator: false,
      },
      {
        id: "ECS_CLUSTER_ACTIVE",
        name: "Cluster Active",
        description: "Verifies that an ECS cluster is in the ACTIVE state.",
        parameters: [
          { name: "clusterName", type: "string", required: true, description: "ECS cluster name" },
        ],
        supportsOperator: false,
      },
    ],
  },
  {
    service: "DynamoDB",
    name: "DynamoDB",
    description: "Monitor table status, configuration, and data protection features.",
    checkTypes: [
      {
        id: "TABLE_EXISTS",
        name: "Table Exists",
        description: "Verifies that a DynamoDB table exists.",
        parameters: [
          { name: "tableName", type: "string", required: true, description: "DynamoDB table name" },
        ],
        supportsOperator: false,
      },
      {
        id: "TABLE_STATUS_ACTIVE",
        name: "Table Status Active",
        description: "Checks if a DynamoDB table is in ACTIVE status.",
        parameters: [
          { name: "tableName", type: "string", required: true, description: "DynamoDB table name" },
        ],
        supportsOperator: false,
      },
      {
        id: "BILLING_MODE_MATCHES",
        name: "Billing Mode Matches",
        description: "Verifies the billing mode (PAY_PER_REQUEST or PROVISIONED).",
        parameters: [
          { name: "tableName", type: "string", required: true, description: "DynamoDB table name" },
          { name: "expectedBillingMode", type: "string", required: true, description: "PAY_PER_REQUEST or PROVISIONED" },
        ],
        supportsOperator: false,
      },
      {
        id: "POINT_IN_TIME_RECOVERY_ENABLED",
        name: "Point-in-Time Recovery Enabled",
        description: "Checks if PITR is enabled for data protection.",
        parameters: [
          { name: "tableName", type: "string", required: true, description: "DynamoDB table name" },
        ],
        supportsOperator: false,
      },
      {
        id: "ENCRYPTION_ENABLED",
        name: "Encryption Enabled",
        description: "Verifies encryption at rest is enabled.",
        parameters: [
          { name: "tableName", type: "string", required: true, description: "DynamoDB table name" },
        ],
        supportsOperator: false,
      },
      {
        id: "DELETION_PROTECTION_ENABLED",
        name: "Deletion Protection Enabled",
        description: "Checks if deletion protection is enabled.",
        parameters: [
          { name: "tableName", type: "string", required: true, description: "DynamoDB table name" },
        ],
        supportsOperator: false,
      },
    ],
  },
  {
    service: "Lambda",
    name: "Lambda Functions",
    description: "Monitor function configurations, security settings, and resource allocations.",
    checkTypes: [
      {
        id: "VPC_CONFIGURED",
        name: "VPC Configured",
        description: "Verifies that a Lambda function is configured to run in a VPC.",
        parameters: [
          { name: "functionName", type: "string", required: true, description: "Lambda function name" },
        ],
        supportsOperator: false,
      },
      {
        id: "RESERVED_CONCURRENCY_SET",
        name: "Reserved Concurrency Set",
        description: "Checks if reserved concurrency is configured.",
        parameters: [
          { name: "functionName", type: "string", required: true, description: "Lambda function name" },
          { name: "expectedConcurrency", type: "number", required: false, description: "Expected concurrency value" },
        ],
        supportsOperator: false,
      },
      {
        id: "FUNCTION_URL_AUTH_TYPE",
        name: "Function URL Auth Type",
        description: "Verifies the authentication type for a Lambda function URL.",
        parameters: [
          { name: "functionName", type: "string", required: true, description: "Lambda function name" },
          { name: "expectedAuthType", type: "string", required: true, description: "AWS_IAM or NONE" },
        ],
        supportsOperator: false,
      },
      {
        id: "ENVIRONMENT_VARIABLE_EXISTS",
        name: "Environment Variable Exists",
        description: "Checks if a specific environment variable is set.",
        parameters: [
          { name: "functionName", type: "string", required: true, description: "Lambda function name" },
          { name: "variableName", type: "string", required: true, description: "Environment variable name" },
        ],
        supportsOperator: false,
      },
      {
        id: "LAYER_ATTACHED",
        name: "Layer Attached",
        description: "Verifies that a specific Lambda layer is attached.",
        parameters: [
          { name: "functionName", type: "string", required: true, description: "Lambda function name" },
          { name: "layerArn", type: "string", required: true, description: "Layer ARN" },
        ],
        supportsOperator: false,
      },
      {
        id: "DEAD_LETTER_QUEUE_CONFIGURED",
        name: "Dead Letter Queue Configured",
        description: "Checks if a DLQ is configured for handling failed invocations.",
        parameters: [
          { name: "functionName", type: "string", required: true, description: "Lambda function name" },
        ],
        supportsOperator: false,
      },
      {
        id: "LAMBDA_FUNCTION_COUNT",
        name: "Function Count",
        description: "Counts Lambda functions, optionally filtered by prefix or runtime.",
        parameters: [
          { name: "expectedCount", type: "number", required: true, description: "Expected function count" },
          { name: "namePrefix", type: "string", required: false, description: "Filter by name prefix" },
          { name: "runtime", type: "string", required: false, description: "Filter by runtime (e.g., nodejs18.x)" },
        ],
        supportsOperator: true,
        defaultOperator: "EQUALS",
      },
    ],
  },
  {
    service: "CloudFront",
    name: "CloudFront CDN",
    description: "Monitor distribution settings, origins, and security configurations.",
    checkTypes: [
      {
        id: "DISTRIBUTION_EXISTS",
        name: "Distribution Exists",
        description: "Verifies that a CloudFront distribution exists.",
        parameters: [
          { name: "distributionId", type: "string", required: true, description: "Distribution ID" },
        ],
        supportsOperator: false,
      },
      {
        id: "DISTRIBUTION_ENABLED",
        name: "Distribution Enabled",
        description: "Checks if a distribution is enabled and serving traffic.",
        parameters: [
          { name: "distributionId", type: "string", required: true, description: "Distribution ID" },
        ],
        supportsOperator: false,
      },
      {
        id: "ORIGIN_EXISTS",
        name: "Origin Exists",
        description: "Verifies that a specific origin is configured.",
        parameters: [
          { name: "distributionId", type: "string", required: true, description: "Distribution ID" },
          { name: "originId", type: "string", required: true, description: "Origin ID" },
        ],
        supportsOperator: false,
      },
      {
        id: "DEFAULT_ROOT_OBJECT_SET",
        name: "Default Root Object Set",
        description: "Checks if a default root object is configured.",
        parameters: [
          { name: "distributionId", type: "string", required: true, description: "Distribution ID" },
          { name: "expectedObject", type: "string", required: true, description: "Expected root object (e.g., index.html)" },
        ],
        supportsOperator: false,
      },
      {
        id: "VIEWER_PROTOCOL_HTTPS_ONLY",
        name: "Viewer Protocol HTTPS Only",
        description: "Verifies that the distribution only accepts HTTPS connections.",
        parameters: [
          { name: "distributionId", type: "string", required: true, description: "Distribution ID" },
        ],
        supportsOperator: false,
      },
      {
        id: "WAF_ENABLED",
        name: "WAF Enabled",
        description: "Checks if AWS WAF is associated with the distribution.",
        parameters: [
          { name: "distributionId", type: "string", required: true, description: "Distribution ID" },
        ],
        supportsOperator: false,
      },
      {
        id: "ORIGIN_ACCESS_CONTROL_CONFIGURED",
        name: "Origin Access Control Configured",
        description: "Verifies OAC is configured for secure S3 access.",
        parameters: [
          { name: "distributionId", type: "string", required: true, description: "Distribution ID" },
          { name: "originId", type: "string", required: true, description: "Origin ID" },
        ],
        supportsOperator: false,
      },
    ],
  },
  {
    service: "ConfigService",
    name: "AWS Config",
    description: "Monitor configuration recorders, rules, and compliance status.",
    checkTypes: [
      {
        id: "CONFIG_RECORDER_ACTIVE",
        name: "Config Recorder Active",
        description: "Verifies that the AWS Config recorder is actively recording.",
        parameters: [
          { name: "recorderName", type: "string", required: false, description: "Recorder name (defaults to 'default')" },
        ],
        supportsOperator: false,
      },
      {
        id: "CONFIG_RULE_COMPLIANT",
        name: "Config Rule Compliant",
        description: "Checks if all resources are compliant with a Config rule.",
        parameters: [
          { name: "ruleName", type: "string", required: true, description: "AWS Config rule name" },
        ],
        supportsOperator: false,
      },
      {
        id: "DELIVERY_CHANNEL_CONFIGURED",
        name: "Delivery Channel Configured",
        description: "Verifies that a Config delivery channel is properly configured.",
        parameters: [
          { name: "channelName", type: "string", required: false, description: "Channel name (defaults to 'default')" },
        ],
        supportsOperator: false,
      },
      {
        id: "RESOURCE_COMPLIANT",
        name: "Resource Compliant",
        description: "Checks if a specific resource is compliant with all applicable Config rules.",
        parameters: [
          { name: "resourceId", type: "string", required: true, description: "AWS resource ID" },
          { name: "resourceType", type: "string", required: true, description: "AWS resource type (e.g., AWS::EC2::Instance)" },
        ],
        supportsOperator: false,
      },
      {
        id: "CONFORMANCE_PACK_COMPLIANT",
        name: "Conformance Pack Compliant",
        description: "Verifies compliance with all rules in a conformance pack.",
        parameters: [
          { name: "conformancePackName", type: "string", required: true, description: "Conformance pack name" },
        ],
        supportsOperator: false,
      },
      {
        id: "AGGREGATOR_CONFIGURED",
        name: "Aggregator Configured",
        description: "Checks if a Config aggregator is properly set up.",
        parameters: [
          { name: "aggregatorName", type: "string", required: true, description: "Config aggregator name" },
        ],
        supportsOperator: false,
      },
    ],
  },
];
