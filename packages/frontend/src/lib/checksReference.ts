/**
 * CloudCorrect Checks Reference
 *
 * This file contains comprehensive metadata for all AWS services and check types
 * supported by CloudCorrect. Used for UI components, documentation, and validation.
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type ServiceId =
  | 'EC2'
  | 'ALB'
  | 'Route53'
  | 'IAM'
  | 'S3'
  | 'NETWORK'
  | 'RDS'
  | 'ECS'
  | 'DynamoDB'
  | 'Lambda'
  | 'CloudFront'
  | 'ConfigService';

export type ServiceCategory =
  | 'compute'
  | 'networking'
  | 'storage'
  | 'database'
  | 'security'
  | 'monitoring';

export type IconName =
  | 'Server'
  | 'Activity'
  | 'Globe'
  | 'Shield'
  | 'Database'
  | 'Zap'
  | 'Layers'
  | 'Cloud';

export type ParameterType = 'string' | 'number' | 'select' | 'boolean';

export interface ParameterDefinition {
  name: string;
  label: string;
  placeholder: string;
  help: string;
  type: ParameterType;
  required: boolean;
  options?: { value: string; label: string }[];
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface CheckTypeDefinition {
  id: string;
  name: string;
  description: string;
  whenToUse: string;
  parameters: ParameterDefinition[];
  supportsOperator: boolean;
  defaultOperator?: string;
}

export interface ServiceDefinition {
  id: ServiceId;
  name: string;
  description: string;
  icon: IconName;
  iconColor?: string;
  categories: ServiceCategory[];
  checkTypes: CheckTypeDefinition[];
  aliasProperties: string[];
}

// =============================================================================
// OPERATOR DEFINITIONS
// =============================================================================

export const OPERATORS = [
  { value: 'EQUALS', label: 'Equals', description: 'Value must exactly match' },
  { value: 'NOT_EQUALS', label: 'Not Equals', description: 'Value must not match' },
  { value: 'CONTAINS', label: 'Contains', description: 'Value must contain the substring' },
  { value: 'NOT_CONTAINS', label: 'Not Contains', description: 'Value must not contain the substring' },
  { value: 'GREATER_THAN', label: 'Greater Than', description: 'Value must be greater than' },
  { value: 'LESS_THAN', label: 'Less Than', description: 'Value must be less than' },
  { value: 'GREATER_THAN_OR_EQUALS', label: 'Greater Than or Equals', description: 'Value must be greater than or equal to' },
  { value: 'LESS_THAN_OR_EQUALS', label: 'Less Than or Equals', description: 'Value must be less than or equal to' },
  { value: 'IN_LIST', label: 'In List', description: 'Value must be one of the specified values' },
  { value: 'NOT_IN_LIST', label: 'Not In List', description: 'Value must not be one of the specified values' },
  { value: 'IS_EMPTY', label: 'Is Empty', description: 'Value must be empty or null' },
  { value: 'IS_NOT_EMPTY', label: 'Is Not Empty', description: 'Value must not be empty' },
] as const;

export type OperatorType = typeof OPERATORS[number]['value'];

// =============================================================================
// SERVICE DEFINITIONS
// =============================================================================

export const SERVICES: Record<ServiceId, ServiceDefinition> = {
  // ---------------------------------------------------------------------------
  // EC2 - Elastic Compute Cloud
  // ---------------------------------------------------------------------------
  EC2: {
    id: 'EC2',
    name: 'EC2 Instances',
    description: 'Amazon Elastic Compute Cloud provides scalable virtual servers in the cloud. Monitor instance states, network configurations, and security group assignments.',
    icon: 'Server',
    categories: ['compute'],
    aliasProperties: ['publicIp', 'privateIp', 'instanceId', 'state', 'stateReason', 'instanceType', 'az', 'vpcId', 'subnetId'],
    checkTypes: [
      {
        id: 'INSTANCE_RUNNING',
        name: 'Instance is Running',
        description: 'Verifies that a specific EC2 instance is in the running state.',
        whenToUse: 'Use when you need to ensure a critical instance is always running, such as a production web server or database host.',
        parameters: [
          {
            name: 'instanceId',
            label: 'Instance ID',
            placeholder: 'i-0123456789abcdef0',
            help: 'The unique identifier of the EC2 instance (starts with i-)',
            type: 'string',
            required: true,
            validation: { pattern: '^i-[a-f0-9]{8,17}$' }
          }
        ],
        supportsOperator: false
      },
      {
        id: 'INSTANCE_HAS_PUBLIC_IP',
        name: 'Instance has Public IP',
        description: 'Checks if a specific EC2 instance has a public IP address assigned.',
        whenToUse: 'Use to verify that public-facing instances have internet accessibility, or to ensure internal instances do NOT have public IPs for security.',
        parameters: [
          {
            name: 'instanceId',
            label: 'Instance ID',
            placeholder: 'i-0123456789abcdef0',
            help: 'The unique identifier of the EC2 instance to check',
            type: 'string',
            required: true,
            validation: { pattern: '^i-[a-f0-9]{8,17}$' }
          }
        ],
        supportsOperator: false
      },
      {
        id: 'HAS_PUBLIC_IP',
        name: 'Has Public IP',
        description: 'Generic check for public IP availability on an instance.',
        whenToUse: 'Use when you need to verify public IP assignment without specifying an instance ID upfront.',
        parameters: [
          {
            name: 'instanceId',
            label: 'Instance ID',
            placeholder: 'i-0123456789abcdef0',
            help: 'The EC2 instance ID to check for public IP',
            type: 'string',
            required: true,
            validation: { pattern: '^i-[a-f0-9]{8,17}$' }
          }
        ],
        supportsOperator: false
      },
      {
        id: 'IN_SECURITY_GROUP',
        name: 'In Security Group',
        description: 'Verifies that an EC2 instance belongs to a specific security group.',
        whenToUse: 'Use to ensure instances are protected by the correct firewall rules, such as verifying production servers are in the production security group.',
        parameters: [
          {
            name: 'securityGroupId',
            label: 'Security Group ID',
            placeholder: 'sg-0123456789abcdef0',
            help: 'The security group ID that the instance should belong to',
            type: 'string',
            required: true,
            validation: { pattern: '^sg-[a-f0-9]{8,17}$' }
          }
        ],
        supportsOperator: false
      },
      {
        id: 'IN_SUBNET',
        name: 'In Subnet',
        description: 'Checks if an EC2 instance is deployed in a specific subnet.',
        whenToUse: 'Use to verify network segmentation, ensuring instances are in the correct private or public subnets.',
        parameters: [
          {
            name: 'subnetId',
            label: 'Subnet ID',
            placeholder: 'subnet-0123456789abcdef0',
            help: 'The subnet ID where the instance should be located',
            type: 'string',
            required: true,
            validation: { pattern: '^subnet-[a-f0-9]{8,17}$' }
          }
        ],
        supportsOperator: false
      },
      {
        id: 'DEFAULT_VPC',
        name: 'Default VPC',
        description: 'Checks for the presence of default VPCs in your account.',
        whenToUse: 'Use to verify security compliance - many organizations require default VPCs to be deleted to prevent accidental resource exposure.',
        parameters: [
          {
            name: 'expectedCount',
            label: 'Expected Count',
            placeholder: '0',
            help: 'Expected number of default VPCs. Use 0 with EQUALS operator to ensure no default VPC exists.',
            type: 'number',
            required: true,
            validation: { min: 0 }
          }
        ],
        supportsOperator: true,
        defaultOperator: 'EQUALS'
      },
      {
        id: 'RUNNING_INSTANCE_COUNT',
        name: 'Running Instance Count',
        description: 'Counts the number of currently running EC2 instances, optionally filtered by tags.',
        whenToUse: 'Use for capacity monitoring, cost management, or ensuring minimum/maximum instance counts for auto-scaling verification.',
        parameters: [
          {
            name: 'expectedCount',
            label: 'Expected Count',
            placeholder: '5',
            help: 'The expected number of running instances',
            type: 'number',
            required: true,
            validation: { min: 0 }
          },
          {
            name: 'tagKey',
            label: 'Tag Key (Optional)',
            placeholder: 'Environment',
            help: 'Filter instances by this tag key',
            type: 'string',
            required: false
          },
          {
            name: 'tagValue',
            label: 'Tag Value (Optional)',
            placeholder: 'Production',
            help: 'Filter instances by this tag value (requires Tag Key)',
            type: 'string',
            required: false
          }
        ],
        supportsOperator: true,
        defaultOperator: 'EQUALS'
      },
      {
        id: 'INSTANCE_COUNT',
        name: 'Instance Count',
        description: 'Counts total EC2 instances regardless of state, optionally filtered by tags.',
        whenToUse: 'Use for inventory management, cost tracking, or compliance audits requiring total instance counts.',
        parameters: [
          {
            name: 'expectedCount',
            label: 'Expected Count',
            placeholder: '10',
            help: 'The expected total number of instances',
            type: 'number',
            required: true,
            validation: { min: 0 }
          },
          {
            name: 'tagKey',
            label: 'Tag Key (Optional)',
            placeholder: 'Team',
            help: 'Filter instances by this tag key',
            type: 'string',
            required: false
          },
          {
            name: 'tagValue',
            label: 'Tag Value (Optional)',
            placeholder: 'Backend',
            help: 'Filter instances by this tag value (requires Tag Key)',
            type: 'string',
            required: false
          }
        ],
        supportsOperator: true,
        defaultOperator: 'EQUALS'
      }
    ]
  },

  // ---------------------------------------------------------------------------
  // ALB - Application Load Balancer
  // ---------------------------------------------------------------------------
  ALB: {
    id: 'ALB',
    name: 'Load Balancers (ALB)',
    description: 'Application Load Balancers distribute incoming application traffic across multiple targets. Monitor target health and listener configurations.',
    icon: 'Activity',
    categories: ['networking', 'compute'],
    aliasProperties: ['healthyCount', 'totalCount', 'targetGroupArn', 'listenerPort', 'protocol'],
    checkTypes: [
      {
        id: 'TARGET_GROUP_HEALTHY',
        name: 'Target Group Healthy',
        description: 'Verifies that a target group has healthy targets meeting the minimum threshold.',
        whenToUse: 'Use to ensure your application has sufficient healthy instances behind a load balancer for high availability.',
        parameters: [
          {
            name: 'targetGroupArn',
            label: 'Target Group ARN',
            placeholder: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-tg/abc123',
            help: 'The full ARN of the target group to check',
            type: 'string',
            required: true
          },
          {
            name: 'expectedCount',
            label: 'Minimum Healthy Count',
            placeholder: '2',
            help: 'Minimum number of healthy targets required. Leave empty for at least 1.',
            type: 'number',
            required: false,
            validation: { min: 0 }
          }
        ],
        supportsOperator: false
      },
      {
        id: 'TARGET_GROUP_HEALTHY_COUNT',
        name: 'Target Group Healthy Count',
        description: 'Counts healthy targets in a target group and compares against expected value using an operator.',
        whenToUse: 'Use for precise capacity verification, such as ensuring exactly N healthy instances or monitoring scaling events.',
        parameters: [
          {
            name: 'targetGroupArn',
            label: 'Target Group ARN',
            placeholder: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-tg/abc123',
            help: 'The full ARN of the target group to check',
            type: 'string',
            required: true
          },
          {
            name: 'expectedCount',
            label: 'Expected Count',
            placeholder: '3',
            help: 'Number of healthy targets to compare using the selected operator',
            type: 'number',
            required: true,
            validation: { min: 0 }
          }
        ],
        supportsOperator: true,
        defaultOperator: 'GREATER_THAN_OR_EQUALS'
      },
      {
        id: 'ALB_LISTENER_EXISTS',
        name: 'Listener Exists',
        description: 'Verifies that a specific listener port is configured on the load balancer.',
        whenToUse: 'Use to ensure your ALB is properly configured to accept traffic on required ports like 80, 443, or custom ports.',
        parameters: [
          {
            name: 'loadBalancerArn',
            label: 'Load Balancer ARN',
            placeholder: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-alb/abc123',
            help: 'The full ARN of the Application Load Balancer',
            type: 'string',
            required: true
          },
          {
            name: 'listenerPort',
            label: 'Listener Port',
            placeholder: '443',
            help: 'The port number the listener should be configured on',
            type: 'number',
            required: true,
            validation: { min: 1, max: 65535 }
          }
        ],
        supportsOperator: false
      }
    ]
  },

  // ---------------------------------------------------------------------------
  // Route53 - DNS Service
  // ---------------------------------------------------------------------------
  Route53: {
    id: 'Route53',
    name: 'Route 53 DNS',
    description: 'Amazon Route 53 is a scalable DNS web service. Monitor DNS records, verify configurations, and track TTL settings.',
    icon: 'Globe',
    categories: ['networking'],
    aliasProperties: ['values', 'type', 'ttl'],
    checkTypes: [
      {
        id: 'DNS_POINTS_TO',
        name: 'DNS Points To',
        description: 'Verifies that a DNS record resolves to the expected value.',
        whenToUse: 'Use to ensure DNS records point to correct resources after deployments, migrations, or failover events.',
        parameters: [
          {
            name: 'recordName',
            label: 'Record Name',
            placeholder: 'api.example.com',
            help: 'The fully qualified domain name to check',
            type: 'string',
            required: true
          },
          {
            name: 'expectedValue',
            label: 'Expected Value',
            placeholder: '192.0.2.1 or alias.cloudfront.net',
            help: 'The expected DNS value. Supports dynamic placeholders like {{alias.property}}',
            type: 'string',
            required: true
          },
          {
            name: 'hostedZoneId',
            label: 'Hosted Zone ID',
            placeholder: 'Z1234567890ABC',
            help: 'The Route 53 hosted zone ID containing the record',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: true,
        defaultOperator: 'EQUALS'
      },
      {
        id: 'RECORD_EXISTS',
        name: 'Record Exists',
        description: 'Checks if a DNS record exists in the specified hosted zone.',
        whenToUse: 'Use to verify that required DNS records are present, such as after infrastructure provisioning.',
        parameters: [
          {
            name: 'recordName',
            label: 'Record Name',
            placeholder: 'www.example.com',
            help: 'The DNS record name to check for existence',
            type: 'string',
            required: true
          },
          {
            name: 'hostedZoneId',
            label: 'Hosted Zone ID',
            placeholder: 'Z1234567890ABC',
            help: 'The Route 53 hosted zone ID to search in',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'TTL_EQUALS',
        name: 'TTL Equals',
        description: 'Verifies that a DNS record has the expected Time To Live value.',
        whenToUse: 'Use to ensure DNS caching behavior is correct, especially important during migrations or for high-availability setups.',
        parameters: [
          {
            name: 'recordName',
            label: 'Record Name',
            placeholder: 'app.example.com',
            help: 'The DNS record name to check',
            type: 'string',
            required: true
          },
          {
            name: 'expectedTtl',
            label: 'Expected TTL',
            placeholder: '300',
            help: 'The expected TTL value in seconds',
            type: 'number',
            required: true,
            validation: { min: 0 }
          },
          {
            name: 'hostedZoneId',
            label: 'Hosted Zone ID',
            placeholder: 'Z1234567890ABC',
            help: 'The Route 53 hosted zone ID containing the record',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      }
    ]
  },

  // ---------------------------------------------------------------------------
  // IAM - Identity and Access Management
  // ---------------------------------------------------------------------------
  IAM: {
    id: 'IAM',
    name: 'IAM Security',
    description: 'AWS Identity and Access Management controls access to AWS resources. Verify roles, policies, and permission configurations.',
    icon: 'Shield',
    categories: ['security'],
    aliasProperties: ['arn', 'roleName', 'path', 'createDate'],
    checkTypes: [
      {
        id: 'ROLE_EXISTS',
        name: 'Role Exists',
        description: 'Verifies that a specific IAM role exists in the account.',
        whenToUse: 'Use to ensure required service roles are present before deploying applications that depend on them.',
        parameters: [
          {
            name: 'roleName',
            label: 'Role Name',
            placeholder: 'MyApplicationRole',
            help: 'The name of the IAM role to check for existence',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'ROLE_HAS_POLICY',
        name: 'Role Has Policy',
        description: 'Checks if an IAM role has a specific policy attached.',
        whenToUse: 'Use to verify that roles have required permissions, ensuring security compliance and proper access configurations.',
        parameters: [
          {
            name: 'roleName',
            label: 'Role Name',
            placeholder: 'MyApplicationRole',
            help: 'The name of the IAM role to check',
            type: 'string',
            required: true
          },
          {
            name: 'policyArn',
            label: 'Policy ARN',
            placeholder: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
            help: 'The ARN of the policy that should be attached',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'POLICY_ATTACHED_TO_RESOURCE',
        name: 'Policy Attached to Resource',
        description: 'Verifies that a policy is attached to a specific IAM resource.',
        whenToUse: 'Use for compliance checks to ensure policies are properly distributed across roles and users.',
        parameters: [
          {
            name: 'roleName',
            label: 'Role Name',
            placeholder: 'ServiceRole',
            help: 'The IAM role name to check',
            type: 'string',
            required: true
          },
          {
            name: 'policyArn',
            label: 'Policy ARN',
            placeholder: 'arn:aws:iam::123456789012:policy/CustomPolicy',
            help: 'The ARN of the policy to verify attachment',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      }
    ]
  },

  // ---------------------------------------------------------------------------
  // S3 - Simple Storage Service
  // ---------------------------------------------------------------------------
  S3: {
    id: 'S3',
    name: 'S3 Storage',
    description: 'Amazon S3 provides scalable object storage. Monitor bucket configurations, security settings, and object presence.',
    icon: 'Database',
    categories: ['storage'],
    aliasProperties: ['bucketName', 'rulesCount', 'region'],
    checkTypes: [
      {
        id: 'S3_BUCKET_EXISTS',
        name: 'Bucket Exists',
        description: 'Verifies that an S3 bucket exists and is accessible.',
        whenToUse: 'Use to ensure required storage buckets are present before deployments or data operations.',
        parameters: [
          {
            name: 'bucketName',
            label: 'Bucket Name',
            placeholder: 'my-application-bucket',
            help: 'The name of the S3 bucket to check',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'S3_BUCKET_POLICY_PRESENT',
        name: 'Policy Present',
        description: 'Checks if an S3 bucket has a bucket policy configured.',
        whenToUse: 'Use to verify security configurations, ensuring buckets have proper access policies defined.',
        parameters: [
          {
            name: 'bucketName',
            label: 'Bucket Name',
            placeholder: 'my-secure-bucket',
            help: 'The S3 bucket to check for policy presence',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'S3_BUCKET_PUBLIC_ACCESS_BLOCKED',
        name: 'Public Access Blocked',
        description: 'Verifies that public access is blocked on an S3 bucket.',
        whenToUse: 'Use for security compliance to ensure buckets are not accidentally exposed to the public internet.',
        parameters: [
          {
            name: 'bucketName',
            label: 'Bucket Name',
            placeholder: 'my-private-bucket',
            help: 'The S3 bucket to verify public access block settings',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'S3_LIFECYCLE_CONFIGURED',
        name: 'Lifecycle Configured',
        description: 'Checks if an S3 bucket has lifecycle rules configured.',
        whenToUse: 'Use to ensure cost optimization rules are in place, such as transitioning old objects to cheaper storage classes.',
        parameters: [
          {
            name: 'bucketName',
            label: 'Bucket Name',
            placeholder: 'my-logs-bucket',
            help: 'The S3 bucket to check for lifecycle configuration',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'S3_OBJECT_EXISTS',
        name: 'Object Exists',
        description: 'Verifies that a specific object exists in an S3 bucket.',
        whenToUse: 'Use to verify deployments completed successfully or that required configuration files are present.',
        parameters: [
          {
            name: 'bucketName',
            label: 'Bucket Name',
            placeholder: 'my-config-bucket',
            help: 'The S3 bucket containing the object',
            type: 'string',
            required: true
          },
          {
            name: 'objectKey',
            label: 'Object Key',
            placeholder: 'config/app-settings.json',
            help: 'The full key (path) of the object in the bucket',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'S3_BUCKET_COUNT',
        name: 'Bucket Count',
        description: 'Counts S3 buckets in the account, optionally filtered by name prefix.',
        whenToUse: 'Use for inventory management, cost tracking, or compliance audits requiring bucket counts.',
        parameters: [
          {
            name: 'expectedCount',
            label: 'Expected Count',
            placeholder: '10',
            help: 'The expected number of S3 buckets',
            type: 'number',
            required: true,
            validation: { min: 0 }
          },
          {
            name: 'namePrefix',
            label: 'Name Prefix (Optional)',
            placeholder: 'prod-',
            help: 'Filter buckets by name prefix',
            type: 'string',
            required: false
          }
        ],
        supportsOperator: true,
        defaultOperator: 'EQUALS'
      },
      {
        id: 'S3_OBJECT_COUNT',
        name: 'Object Count (in bucket)',
        description: 'Counts objects in an S3 bucket, optionally filtered by prefix.',
        whenToUse: 'Use to monitor bucket contents, verify backup completeness, or track data growth.',
        parameters: [
          {
            name: 'bucketName',
            label: 'Bucket Name',
            placeholder: 'my-data-bucket',
            help: 'The S3 bucket to count objects in',
            type: 'string',
            required: true
          },
          {
            name: 'expectedCount',
            label: 'Expected Count',
            placeholder: '100',
            help: 'The expected number of objects',
            type: 'number',
            required: true,
            validation: { min: 0 }
          },
          {
            name: 'prefix',
            label: 'Prefix (Optional)',
            placeholder: 'backups/',
            help: 'Filter objects by key prefix',
            type: 'string',
            required: false
          }
        ],
        supportsOperator: true,
        defaultOperator: 'EQUALS'
      }
    ]
  },

  // ---------------------------------------------------------------------------
  // NETWORK - Network Health Checks
  // ---------------------------------------------------------------------------
  NETWORK: {
    id: 'NETWORK',
    name: 'Network Health',
    description: 'External network connectivity checks including HTTP endpoints and ICMP ping. Monitor service availability from outside AWS.',
    icon: 'Zap',
    categories: ['networking', 'monitoring'],
    aliasProperties: ['status', 'latency', 'url', 'contentType', 'server'],
    checkTypes: [
      {
        id: 'HTTP_200',
        name: 'HTTP 200 OK',
        description: 'Verifies that a URL returns an HTTP 200 status code.',
        whenToUse: 'Use to monitor web application health, API availability, or any HTTP endpoint uptime.',
        parameters: [
          {
            name: 'url',
            label: 'URL',
            placeholder: 'https://api.example.com/health',
            help: 'The complete URL to check (must include https://)',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'HTTP_RESPONSE_CONTAINS',
        name: 'HTTP Response Contains',
        description: 'Checks if an HTTP response body contains a specific substring.',
        whenToUse: 'Use for deeper health checks that verify response content, such as checking for specific JSON fields or status messages.',
        parameters: [
          {
            name: 'url',
            label: 'URL',
            placeholder: 'https://api.example.com/status',
            help: 'The complete URL to fetch',
            type: 'string',
            required: true
          },
          {
            name: 'expectedSubstring',
            label: 'Expected Substring',
            placeholder: '"status":"healthy"',
            help: 'The text that must be present in the response body',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'PING',
        name: 'ICMP Ping',
        description: 'Performs an ICMP ping to verify host reachability.',
        whenToUse: 'Use to verify basic network connectivity to servers, especially for non-HTTP services.',
        parameters: [
          {
            name: 'target',
            label: 'IP or Hostname',
            placeholder: '192.168.1.1 or server.example.com',
            help: 'The IP address or hostname to ping',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      }
    ]
  },

  // ---------------------------------------------------------------------------
  // RDS - Relational Database Service
  // ---------------------------------------------------------------------------
  RDS: {
    id: 'RDS',
    name: 'RDS Database',
    description: 'Amazon RDS provides managed relational databases. Monitor instance availability, security settings, and network configurations.',
    icon: 'Database',
    iconColor: 'text-blue-500',
    categories: ['database'],
    aliasProperties: ['dbInstanceIdentifier', 'state', 'publicAccess', 'encrypted', 'engine', 'instanceClass'],
    checkTypes: [
      {
        id: 'RDS_INSTANCE_AVAILABLE',
        name: 'Instance Available',
        description: 'Verifies that an RDS database instance is in the available state.',
        whenToUse: 'Use to ensure database availability for applications, especially after maintenance windows or deployments.',
        parameters: [
          {
            name: 'dbInstanceIdentifier',
            label: 'DB Instance Identifier',
            placeholder: 'my-production-db',
            help: 'The unique identifier of the RDS instance',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'RDS_IN_SUBNET_GROUP',
        name: 'In Subnet Group',
        description: 'Checks if an RDS instance is deployed in the specified subnet group.',
        whenToUse: 'Use to verify network segmentation and ensure databases are in the correct private subnets.',
        parameters: [
          {
            name: 'dbInstanceIdentifier',
            label: 'DB Instance Identifier',
            placeholder: 'my-database',
            help: 'The RDS instance identifier to check',
            type: 'string',
            required: true
          },
          {
            name: 'subnetGroupName',
            label: 'Subnet Group Name',
            placeholder: 'my-db-subnet-group',
            help: 'The expected DB subnet group name',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'RDS_PUBLIC_ACCESS_DISABLED',
        name: 'Public Access Disabled',
        description: 'Verifies that an RDS instance does not have public accessibility enabled.',
        whenToUse: 'Use for security compliance to ensure databases are not directly accessible from the internet.',
        parameters: [
          {
            name: 'dbInstanceIdentifier',
            label: 'DB Instance Identifier',
            placeholder: 'my-secure-database',
            help: 'The RDS instance to check for public accessibility',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'RDS_ENCRYPTION_ENABLED',
        name: 'Encryption Enabled',
        description: 'Checks if an RDS instance has storage encryption enabled.',
        whenToUse: 'Use for security and compliance verification to ensure data at rest is encrypted.',
        parameters: [
          {
            name: 'dbInstanceIdentifier',
            label: 'DB Instance Identifier',
            placeholder: 'my-encrypted-database',
            help: 'The RDS instance to check for encryption',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      }
    ]
  },

  // ---------------------------------------------------------------------------
  // ECS - Elastic Container Service
  // ---------------------------------------------------------------------------
  ECS: {
    id: 'ECS',
    name: 'ECS Container Service',
    description: 'Amazon ECS runs Docker containers at scale. Monitor service health, task counts, and cluster status.',
    icon: 'Layers',
    iconColor: 'text-orange-500',
    categories: ['compute'],
    aliasProperties: ['clusterName', 'serviceName', 'running', 'desired', 'status'],
    checkTypes: [
      {
        id: 'ECS_SERVICE_RUNNING',
        name: 'Running (Sufficient)',
        description: 'Verifies that an ECS service has running tasks meeting or exceeding the expected count.',
        whenToUse: 'Use to ensure your containerized applications have minimum required capacity for handling traffic.',
        parameters: [
          {
            name: 'clusterName',
            label: 'Cluster Name',
            placeholder: 'my-ecs-cluster',
            help: 'The name of the ECS cluster',
            type: 'string',
            required: true
          },
          {
            name: 'serviceName',
            label: 'Service Name',
            placeholder: 'my-web-service',
            help: 'The name of the ECS service',
            type: 'string',
            required: true
          },
          {
            name: 'expectedCount',
            label: 'Expected Count (Optional)',
            placeholder: '2',
            help: 'Expected number of running tasks. Uses operator to compare against actual count.',
            type: 'number',
            required: false,
            validation: { min: 0 }
          }
        ],
        supportsOperator: true,
        defaultOperator: 'GREATER_THAN_OR_EQUALS'
      },
      {
        id: 'ECS_SERVICE_RUNNING_COUNT_EQUALS_DESIRED',
        name: 'Running (Exact)',
        description: 'Verifies that running task count exactly matches the desired count.',
        whenToUse: 'Use to verify service stability and that all desired tasks are successfully running.',
        parameters: [
          {
            name: 'clusterName',
            label: 'Cluster Name',
            placeholder: 'my-ecs-cluster',
            help: 'The name of the ECS cluster',
            type: 'string',
            required: true
          },
          {
            name: 'serviceName',
            label: 'Service Name',
            placeholder: 'my-api-service',
            help: 'The name of the ECS service',
            type: 'string',
            required: true
          },
          {
            name: 'expectedCount',
            label: 'Expected Count (Optional)',
            placeholder: '3',
            help: 'Expected number of running tasks equal to desired.',
            type: 'number',
            required: false,
            validation: { min: 0 }
          }
        ],
        supportsOperator: true,
        defaultOperator: 'EQUALS'
      },
      {
        id: 'ECS_RUNNING_TASK_COUNT',
        name: 'Running Task Count',
        description: 'Counts running tasks in a service and compares against expected value.',
        whenToUse: 'Use for precise task count verification, especially when monitoring auto-scaling behavior.',
        parameters: [
          {
            name: 'clusterName',
            label: 'Cluster Name',
            placeholder: 'my-ecs-cluster',
            help: 'The name of the ECS cluster',
            type: 'string',
            required: true
          },
          {
            name: 'serviceName',
            label: 'Service Name',
            placeholder: 'my-worker-service',
            help: 'The name of the ECS service',
            type: 'string',
            required: true
          },
          {
            name: 'expectedCount',
            label: 'Expected Count',
            placeholder: '5',
            help: 'Number of running tasks to compare using the selected operator',
            type: 'number',
            required: true,
            validation: { min: 0 }
          }
        ],
        supportsOperator: true,
        defaultOperator: 'EQUALS'
      },
      {
        id: 'ECS_TASK_DEFINITION_REVISION_ACTIVE',
        name: 'Task Def Revision Active',
        description: 'Verifies that a service is running a specific task definition revision.',
        whenToUse: 'Use to verify deployments completed successfully and services are running the correct version.',
        parameters: [
          {
            name: 'clusterName',
            label: 'Cluster Name',
            placeholder: 'my-ecs-cluster',
            help: 'The name of the ECS cluster',
            type: 'string',
            required: true
          },
          {
            name: 'serviceName',
            label: 'Service Name',
            placeholder: 'my-app-service',
            help: 'The name of the ECS service',
            type: 'string',
            required: true
          },
          {
            name: 'expectedTaskDefinition',
            label: 'Expected Task Definition',
            placeholder: 'my-task:42 or full ARN',
            help: 'The task definition ARN or family:revision format',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'ECS_SERVICE_ATTACHED_TO_ALB',
        name: 'Attached to ALB',
        description: 'Checks if an ECS service is attached to a load balancer.',
        whenToUse: 'Use to verify service discovery and ensure traffic can reach your containers.',
        parameters: [
          {
            name: 'clusterName',
            label: 'Cluster Name',
            placeholder: 'my-ecs-cluster',
            help: 'The name of the ECS cluster',
            type: 'string',
            required: true
          },
          {
            name: 'serviceName',
            label: 'Service Name',
            placeholder: 'my-web-service',
            help: 'The name of the ECS service',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'ECS_CLUSTER_ACTIVE',
        name: 'Cluster Active',
        description: 'Verifies that an ECS cluster is in the ACTIVE state.',
        whenToUse: 'Use to ensure cluster availability before deploying services or running tasks.',
        parameters: [
          {
            name: 'clusterName',
            label: 'Cluster Name',
            placeholder: 'my-ecs-cluster',
            help: 'The name of the ECS cluster to check',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      }
    ]
  },

  // ---------------------------------------------------------------------------
  // DynamoDB - NoSQL Database
  // ---------------------------------------------------------------------------
  DynamoDB: {
    id: 'DynamoDB',
    name: 'DynamoDB',
    description: 'Amazon DynamoDB is a fully managed NoSQL database. Monitor table status, configuration settings, and data protection features.',
    icon: 'Database',
    iconColor: 'text-purple-500',
    categories: ['database'],
    aliasProperties: ['tableName', 'tableStatus', 'billingMode', 'itemCount', 'sizeBytes', 'pitrEnabled', 'encrypted'],
    checkTypes: [
      {
        id: 'TABLE_EXISTS',
        name: 'Table Exists',
        description: 'Verifies that a DynamoDB table exists.',
        whenToUse: 'Use to ensure required tables are present before application deployments.',
        parameters: [
          {
            name: 'tableName',
            label: 'Table Name',
            placeholder: 'my-application-table',
            help: 'The name of the DynamoDB table to check',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'TABLE_STATUS_ACTIVE',
        name: 'Table Status Active',
        description: 'Checks if a DynamoDB table is in the ACTIVE status.',
        whenToUse: 'Use to verify table availability, especially after table creation or restoration.',
        parameters: [
          {
            name: 'tableName',
            label: 'Table Name',
            placeholder: 'my-production-table',
            help: 'The DynamoDB table to check status',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'BILLING_MODE_MATCHES',
        name: 'Billing Mode Matches',
        description: 'Verifies the billing mode (on-demand vs provisioned) of a table.',
        whenToUse: 'Use for cost management to ensure tables are using the expected capacity mode.',
        parameters: [
          {
            name: 'tableName',
            label: 'Table Name',
            placeholder: 'my-table',
            help: 'The DynamoDB table to check',
            type: 'string',
            required: true
          },
          {
            name: 'expectedBillingMode',
            label: 'Expected Billing Mode',
            placeholder: 'PAY_PER_REQUEST',
            help: 'The expected billing mode',
            type: 'select',
            required: true,
            options: [
              { value: 'PAY_PER_REQUEST', label: 'Pay Per Request (On-Demand)' },
              { value: 'PROVISIONED', label: 'Provisioned' }
            ]
          }
        ],
        supportsOperator: false
      },
      {
        id: 'POINT_IN_TIME_RECOVERY_ENABLED',
        name: 'Point-in-Time Recovery Enabled',
        description: 'Checks if PITR is enabled for data protection.',
        whenToUse: 'Use for compliance and disaster recovery verification to ensure tables can be restored.',
        parameters: [
          {
            name: 'tableName',
            label: 'Table Name',
            placeholder: 'my-critical-table',
            help: 'The DynamoDB table to check PITR status',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'ENCRYPTION_ENABLED',
        name: 'Encryption Enabled',
        description: 'Verifies that encryption at rest is enabled on a table.',
        whenToUse: 'Use for security compliance to ensure data is encrypted.',
        parameters: [
          {
            name: 'tableName',
            label: 'Table Name',
            placeholder: 'my-secure-table',
            help: 'The DynamoDB table to check encryption',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'DELETION_PROTECTION_ENABLED',
        name: 'Deletion Protection Enabled',
        description: 'Checks if deletion protection is enabled to prevent accidental table deletion.',
        whenToUse: 'Use for production safety to ensure critical tables cannot be accidentally deleted.',
        parameters: [
          {
            name: 'tableName',
            label: 'Table Name',
            placeholder: 'my-production-table',
            help: 'The DynamoDB table to check deletion protection',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      }
    ]
  },

  // ---------------------------------------------------------------------------
  // Lambda - Serverless Functions
  // ---------------------------------------------------------------------------
  Lambda: {
    id: 'Lambda',
    name: 'Lambda Functions',
    description: 'AWS Lambda runs code without provisioning servers. Monitor function configurations, security settings, and resource allocations.',
    icon: 'Zap',
    iconColor: 'text-orange-500',
    categories: ['compute'],
    aliasProperties: ['functionName', 'runtime', 'memorySize', 'timeout', 'vpcId', 'concurrency', 'state'],
    checkTypes: [
      {
        id: 'VPC_CONFIGURED',
        name: 'VPC Configured',
        description: 'Verifies that a Lambda function is configured to run in a VPC.',
        whenToUse: 'Use when functions need to access VPC resources like RDS databases or internal services.',
        parameters: [
          {
            name: 'functionName',
            label: 'Function Name',
            placeholder: 'my-vpc-function',
            help: 'The name of the Lambda function to check',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'RESERVED_CONCURRENCY_SET',
        name: 'Reserved Concurrency Set',
        description: 'Checks if reserved concurrency is configured for a function.',
        whenToUse: 'Use to ensure critical functions have guaranteed capacity or to limit function invocations.',
        parameters: [
          {
            name: 'functionName',
            label: 'Function Name',
            placeholder: 'my-critical-function',
            help: 'The Lambda function to check',
            type: 'string',
            required: true
          },
          {
            name: 'expectedConcurrency',
            label: 'Expected Concurrency (Optional)',
            placeholder: '100',
            help: 'The expected reserved concurrency value',
            type: 'number',
            required: false,
            validation: { min: 0 }
          }
        ],
        supportsOperator: false
      },
      {
        id: 'FUNCTION_URL_AUTH_TYPE',
        name: 'Function URL Auth Type',
        description: 'Verifies the authentication type for a Lambda function URL.',
        whenToUse: 'Use for security verification to ensure function URLs have proper authentication configured.',
        parameters: [
          {
            name: 'functionName',
            label: 'Function Name',
            placeholder: 'my-api-function',
            help: 'The Lambda function with a function URL',
            type: 'string',
            required: true
          },
          {
            name: 'expectedAuthType',
            label: 'Expected Auth Type',
            placeholder: 'AWS_IAM',
            help: 'The expected authentication type (AWS_IAM or NONE)',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'ENVIRONMENT_VARIABLE_EXISTS',
        name: 'Environment Variable Exists',
        description: 'Checks if a specific environment variable is set on a function.',
        whenToUse: 'Use to verify configuration management and ensure required settings are present.',
        parameters: [
          {
            name: 'functionName',
            label: 'Function Name',
            placeholder: 'my-configured-function',
            help: 'The Lambda function to check',
            type: 'string',
            required: true
          },
          {
            name: 'variableName',
            label: 'Variable Name',
            placeholder: 'DATABASE_URL',
            help: 'The environment variable name to check for',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'LAYER_ATTACHED',
        name: 'Layer Attached',
        description: 'Verifies that a specific Lambda layer is attached to a function.',
        whenToUse: 'Use to ensure functions have required dependencies or shared code layers.',
        parameters: [
          {
            name: 'functionName',
            label: 'Function Name',
            placeholder: 'my-function',
            help: 'The Lambda function to check',
            type: 'string',
            required: true
          },
          {
            name: 'layerArn',
            label: 'Layer ARN',
            placeholder: 'arn:aws:lambda:us-east-1:123456789012:layer:my-layer:1',
            help: 'The ARN of the layer that should be attached',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'DEAD_LETTER_QUEUE_CONFIGURED',
        name: 'Dead Letter Queue Configured',
        description: 'Checks if a DLQ is configured for handling failed invocations.',
        whenToUse: 'Use for reliability verification to ensure failed events are captured for retry or analysis.',
        parameters: [
          {
            name: 'functionName',
            label: 'Function Name',
            placeholder: 'my-async-function',
            help: 'The Lambda function to check DLQ configuration',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'LAMBDA_FUNCTION_COUNT',
        name: 'Function Count',
        description: 'Counts Lambda functions, optionally filtered by prefix or runtime.',
        whenToUse: 'Use for inventory management, cost tracking, or monitoring function proliferation.',
        parameters: [
          {
            name: 'expectedCount',
            label: 'Expected Count',
            placeholder: '50',
            help: 'The expected number of Lambda functions',
            type: 'number',
            required: true,
            validation: { min: 0 }
          },
          {
            name: 'namePrefix',
            label: 'Name Prefix (Optional)',
            placeholder: 'prod-',
            help: 'Filter functions by name prefix',
            type: 'string',
            required: false
          },
          {
            name: 'runtime',
            label: 'Runtime (Optional)',
            placeholder: 'nodejs18.x',
            help: 'Filter functions by runtime (e.g., nodejs18.x, python3.9)',
            type: 'string',
            required: false
          }
        ],
        supportsOperator: true,
        defaultOperator: 'EQUALS'
      }
    ]
  },

  // ---------------------------------------------------------------------------
  // CloudFront - Content Delivery Network
  // ---------------------------------------------------------------------------
  CloudFront: {
    id: 'CloudFront',
    name: 'CloudFront CDN',
    description: 'Amazon CloudFront delivers content globally with low latency. Monitor distribution settings, origins, and security configurations.',
    icon: 'Globe',
    iconColor: 'text-blue-500',
    categories: ['networking'],
    aliasProperties: ['distributionId', 'domainName', 'status', 'enabled', 'origins', 'priceClass'],
    checkTypes: [
      {
        id: 'DISTRIBUTION_EXISTS',
        name: 'Distribution Exists',
        description: 'Verifies that a CloudFront distribution exists.',
        whenToUse: 'Use to ensure CDN infrastructure is present before deployments.',
        parameters: [
          {
            name: 'distributionId',
            label: 'Distribution ID',
            placeholder: 'E1ABCDEF123456',
            help: 'The CloudFront distribution ID',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'DISTRIBUTION_ENABLED',
        name: 'Distribution Enabled',
        description: 'Checks if a CloudFront distribution is enabled and serving traffic.',
        whenToUse: 'Use to verify CDN availability and that content is being delivered.',
        parameters: [
          {
            name: 'distributionId',
            label: 'Distribution ID',
            placeholder: 'E1ABCDEF123456',
            help: 'The CloudFront distribution to check',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'ORIGIN_EXISTS',
        name: 'Origin Exists',
        description: 'Verifies that a specific origin is configured in the distribution.',
        whenToUse: 'Use to ensure correct backend configurations for CDN content sources.',
        parameters: [
          {
            name: 'distributionId',
            label: 'Distribution ID',
            placeholder: 'E1ABCDEF123456',
            help: 'The CloudFront distribution to check',
            type: 'string',
            required: true
          },
          {
            name: 'originId',
            label: 'Origin ID',
            placeholder: 'S3-my-bucket',
            help: 'The origin ID to look for',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'DEFAULT_ROOT_OBJECT_SET',
        name: 'Default Root Object Set',
        description: 'Checks if a default root object is configured for the distribution.',
        whenToUse: 'Use to ensure visitors to the root URL receive content (e.g., index.html).',
        parameters: [
          {
            name: 'distributionId',
            label: 'Distribution ID',
            placeholder: 'E1ABCDEF123456',
            help: 'The CloudFront distribution to check',
            type: 'string',
            required: true
          },
          {
            name: 'expectedObject',
            label: 'Expected Object',
            placeholder: 'index.html',
            help: 'The expected default root object',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'VIEWER_PROTOCOL_HTTPS_ONLY',
        name: 'Viewer Protocol HTTPS Only',
        description: 'Verifies that the distribution only accepts HTTPS connections.',
        whenToUse: 'Use for security compliance to ensure encrypted connections.',
        parameters: [
          {
            name: 'distributionId',
            label: 'Distribution ID',
            placeholder: 'E1ABCDEF123456',
            help: 'The CloudFront distribution to check',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'WAF_ENABLED',
        name: 'WAF Enabled',
        description: 'Checks if AWS WAF is associated with the distribution.',
        whenToUse: 'Use for security verification to ensure web application firewall protection is active.',
        parameters: [
          {
            name: 'distributionId',
            label: 'Distribution ID',
            placeholder: 'E1ABCDEF123456',
            help: 'The CloudFront distribution to check for WAF association',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'ORIGIN_ACCESS_CONTROL_CONFIGURED',
        name: 'Origin Access Control Configured',
        description: 'Verifies that Origin Access Control is configured for secure S3 access.',
        whenToUse: 'Use to ensure S3 origins are only accessible through CloudFront.',
        parameters: [
          {
            name: 'distributionId',
            label: 'Distribution ID',
            placeholder: 'E1ABCDEF123456',
            help: 'The CloudFront distribution to check',
            type: 'string',
            required: true
          },
          {
            name: 'originId',
            label: 'Origin ID',
            placeholder: 'S3-my-bucket',
            help: 'The origin ID to check for OAC configuration',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      }
    ]
  },

  // ---------------------------------------------------------------------------
  // ConfigService - AWS Config
  // ---------------------------------------------------------------------------
  ConfigService: {
    id: 'ConfigService',
    name: 'AWS Config',
    description: 'AWS Config tracks resource configurations and compliance. Monitor configuration recorders, rules, and compliance status.',
    icon: 'Shield',
    iconColor: 'text-green-500',
    categories: ['monitoring', 'security'],
    aliasProperties: ['recorderName', 'recorderStatus', 'deliveryChannel', 'rulesCount', 'complianceStatus'],
    checkTypes: [
      {
        id: 'CONFIG_RECORDER_ACTIVE',
        name: 'Config Recorder Active',
        description: 'Verifies that the AWS Config recorder is actively recording.',
        whenToUse: 'Use to ensure configuration tracking is operational for compliance and auditing.',
        parameters: [
          {
            name: 'recorderName',
            label: 'Recorder Name (Optional)',
            placeholder: 'default',
            help: 'The Config recorder name. Defaults to "default" if not specified.',
            type: 'string',
            required: false
          }
        ],
        supportsOperator: false
      },
      {
        id: 'CONFIG_RULE_COMPLIANT',
        name: 'Config Rule Compliant',
        description: 'Checks if all resources are compliant with a specific Config rule.',
        whenToUse: 'Use to verify compliance with organizational policies and AWS best practices.',
        parameters: [
          {
            name: 'ruleName',
            label: 'Config Rule Name',
            placeholder: 's3-bucket-public-read-prohibited',
            help: 'The name of the AWS Config rule to check',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'DELIVERY_CHANNEL_CONFIGURED',
        name: 'Delivery Channel Configured',
        description: 'Verifies that a Config delivery channel is properly configured.',
        whenToUse: 'Use to ensure configuration snapshots and changes are being delivered to S3.',
        parameters: [
          {
            name: 'channelName',
            label: 'Channel Name (Optional)',
            placeholder: 'default',
            help: 'The delivery channel name. Defaults to "default" if not specified.',
            type: 'string',
            required: false
          }
        ],
        supportsOperator: false
      },
      {
        id: 'RESOURCE_COMPLIANT',
        name: 'Resource Compliant',
        description: 'Checks if a specific resource is compliant with all applicable Config rules.',
        whenToUse: 'Use for targeted compliance verification of critical resources.',
        parameters: [
          {
            name: 'resourceId',
            label: 'Resource ID',
            placeholder: 'i-0123456789abcdef0',
            help: 'The ID of the resource to check compliance for',
            type: 'string',
            required: true
          },
          {
            name: 'resourceType',
            label: 'Resource Type',
            placeholder: 'AWS::EC2::Instance',
            help: 'The AWS resource type (e.g., AWS::EC2::Instance, AWS::S3::Bucket)',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'CONFORMANCE_PACK_COMPLIANT',
        name: 'Conformance Pack Compliant',
        description: 'Verifies compliance with all rules in a conformance pack.',
        whenToUse: 'Use for comprehensive compliance verification against security frameworks or organizational standards.',
        parameters: [
          {
            name: 'conformancePackName',
            label: 'Conformance Pack Name',
            placeholder: 'my-security-pack',
            help: 'The name of the conformance pack to check',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      },
      {
        id: 'AGGREGATOR_CONFIGURED',
        name: 'Aggregator Configured',
        description: 'Checks if a Config aggregator is properly set up for multi-account visibility.',
        whenToUse: 'Use for organizations to verify centralized configuration monitoring.',
        parameters: [
          {
            name: 'aggregatorName',
            label: 'Aggregator Name',
            placeholder: 'my-org-aggregator',
            help: 'The name of the Config aggregator to check',
            type: 'string',
            required: true
          }
        ],
        supportsOperator: false
      }
    ]
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all services as an array
 */
export function getAllServices(): ServiceDefinition[] {
  return Object.values(SERVICES);
}

/**
 * Get a specific service by ID
 */
export function getService(serviceId: ServiceId): ServiceDefinition | undefined {
  return SERVICES[serviceId];
}

/**
 * Get all check types for a service
 */
export function getCheckTypes(serviceId: ServiceId): CheckTypeDefinition[] {
  return SERVICES[serviceId]?.checkTypes || [];
}

/**
 * Get a specific check type by service and type ID
 */
export function getCheckType(serviceId: ServiceId, checkTypeId: string): CheckTypeDefinition | undefined {
  return SERVICES[serviceId]?.checkTypes.find(ct => ct.id === checkTypeId);
}

/**
 * Get services filtered by category
 */
export function getServicesByCategory(category: ServiceCategory): ServiceDefinition[] {
  return Object.values(SERVICES).filter(service => service.categories.includes(category));
}

/**
 * Get all service IDs
 */
export function getServiceIds(): ServiceId[] {
  return Object.keys(SERVICES) as ServiceId[];
}

/**
 * Get operator by value
 */
export function getOperator(value: string) {
  return OPERATORS.find(op => op.value === value);
}

/**
 * Check if a check type supports operators
 */
export function supportsOperator(serviceId: ServiceId, checkTypeId: string): boolean {
  const checkType = getCheckType(serviceId, checkTypeId);
  return checkType?.supportsOperator ?? false;
}

/**
 * Get alias properties available for a service
 */
export function getAliasProperties(serviceId: ServiceId): string[] {
  return SERVICES[serviceId]?.aliasProperties || [];
}

/**
 * Format alias properties as placeholder text
 */
export function formatAliasPlaceholder(alias: string, property: string): string {
  return `{{${alias}.${property}}}`;
}

// =============================================================================
// SERVICE CATEGORIES METADATA
// =============================================================================

export const SERVICE_CATEGORIES: Record<ServiceCategory, { name: string; description: string }> = {
  compute: {
    name: 'Compute',
    description: 'Services that provide computing capacity'
  },
  networking: {
    name: 'Networking',
    description: 'Services for network connectivity and delivery'
  },
  storage: {
    name: 'Storage',
    description: 'Services for data storage'
  },
  database: {
    name: 'Database',
    description: 'Managed database services'
  },
  security: {
    name: 'Security',
    description: 'Security and identity services'
  },
  monitoring: {
    name: 'Monitoring',
    description: 'Monitoring and compliance services'
  }
};
