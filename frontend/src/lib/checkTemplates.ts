/**
 * CloudCorrect Check Templates
 *
 * Pre-defined check configurations for common AWS monitoring scenarios.
 * Templates provide a starting point for users to quickly set up check groups
 * for typical use cases like security baselines, web app monitoring, etc.
 */

import { ServiceId } from './checksReference';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface TemplateCheck {
  service: ServiceId;
  type: string;
  name: string;
  parameters: Record<string, string | number | boolean>;
  operator?: string;
  expectedValue?: string | number;
}

export interface CheckTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  checks: TemplateCheck[];
  parameterLabels: Record<string, string>;
}

// =============================================================================
// TEMPLATE DEFINITIONS
// =============================================================================

export const CHECK_TEMPLATES: CheckTemplate[] = [
  // ---------------------------------------------------------------------------
  // Security Baseline Template
  // ---------------------------------------------------------------------------
  {
    id: 'security-baseline',
    name: 'Security Baseline',
    description: 'Essential security checks for AWS accounts including S3 public access, RDS encryption, and IAM role verification.',
    category: 'Security',
    checks: [
      {
        service: 'S3',
        type: 'S3_BUCKET_PUBLIC_ACCESS_BLOCKED',
        name: 'S3 Bucket Public Access Blocked',
        parameters: {
          bucketName: ''
        }
      },
      {
        service: 'RDS',
        type: 'RDS_PUBLIC_ACCESS_DISABLED',
        name: 'RDS Public Access Disabled',
        parameters: {
          dbInstanceIdentifier: ''
        }
      },
      {
        service: 'RDS',
        type: 'RDS_ENCRYPTION_ENABLED',
        name: 'RDS Encryption Enabled',
        parameters: {
          dbInstanceIdentifier: ''
        }
      },
      {
        service: 'IAM',
        type: 'ROLE_EXISTS',
        name: 'IAM Role Exists',
        parameters: {
          roleName: ''
        }
      },
      {
        service: 'EC2',
        type: 'DEFAULT_VPC',
        name: 'No Default VPC',
        parameters: {
          expectedCount: 0
        },
        operator: 'EQUALS',
        expectedValue: 0
      }
    ],
    parameterLabels: {
      'bucketName': 'S3 Bucket Name',
      'dbInstanceIdentifier': 'RDS Instance Identifier',
      'roleName': 'IAM Role Name'
    }
  },

  // ---------------------------------------------------------------------------
  // Web App Monitoring Template
  // ---------------------------------------------------------------------------
  {
    id: 'web-app-monitoring',
    name: 'Web App Monitoring',
    description: 'Monitor web application health including HTTP endpoints, load balancer targets, and ECS services.',
    category: 'Monitoring',
    checks: [
      {
        service: 'NETWORK',
        type: 'HTTP_200',
        name: 'HTTP Health Check',
        parameters: {
          url: ''
        }
      },
      {
        service: 'ALB',
        type: 'TARGET_GROUP_HEALTHY',
        name: 'ALB Target Group Healthy',
        parameters: {
          targetGroupArn: '',
          expectedCount: 2
        }
      },
      {
        service: 'ECS',
        type: 'ECS_SERVICE_RUNNING',
        name: 'ECS Service Running',
        parameters: {
          clusterName: '',
          serviceName: '',
          expectedCount: 2
        },
        operator: 'GREATER_THAN_OR_EQUALS',
        expectedValue: 2
      },
      {
        service: 'CloudFront',
        type: 'DISTRIBUTION_ENABLED',
        name: 'CloudFront Distribution Enabled',
        parameters: {
          distributionId: ''
        }
      }
    ],
    parameterLabels: {
      'url': 'Health Check URL',
      'targetGroupArn': 'Target Group ARN',
      'clusterName': 'ECS Cluster Name',
      'serviceName': 'ECS Service Name',
      'distributionId': 'CloudFront Distribution ID'
    }
  },

  // ---------------------------------------------------------------------------
  // Database Protection Template
  // ---------------------------------------------------------------------------
  {
    id: 'database-protection',
    name: 'Database Protection',
    description: 'Comprehensive database monitoring for RDS and DynamoDB including availability, encryption, and backup verification.',
    category: 'Database',
    checks: [
      {
        service: 'RDS',
        type: 'RDS_INSTANCE_AVAILABLE',
        name: 'RDS Instance Available',
        parameters: {
          dbInstanceIdentifier: ''
        }
      },
      {
        service: 'RDS',
        type: 'RDS_ENCRYPTION_ENABLED',
        name: 'RDS Encryption Enabled',
        parameters: {
          dbInstanceIdentifier: ''
        }
      },
      {
        service: 'RDS',
        type: 'RDS_PUBLIC_ACCESS_DISABLED',
        name: 'RDS Public Access Disabled',
        parameters: {
          dbInstanceIdentifier: ''
        }
      },
      {
        service: 'DynamoDB',
        type: 'TABLE_STATUS_ACTIVE',
        name: 'DynamoDB Table Active',
        parameters: {
          tableName: ''
        }
      },
      {
        service: 'DynamoDB',
        type: 'POINT_IN_TIME_RECOVERY_ENABLED',
        name: 'DynamoDB PITR Enabled',
        parameters: {
          tableName: ''
        }
      },
      {
        service: 'DynamoDB',
        type: 'ENCRYPTION_ENABLED',
        name: 'DynamoDB Encryption Enabled',
        parameters: {
          tableName: ''
        }
      }
    ],
    parameterLabels: {
      'dbInstanceIdentifier': 'RDS Instance Identifier',
      'tableName': 'DynamoDB Table Name'
    }
  },

  // ---------------------------------------------------------------------------
  // DNS Monitoring Template
  // ---------------------------------------------------------------------------
  {
    id: 'dns-monitoring',
    name: 'DNS Monitoring',
    description: 'Monitor DNS configurations including record existence, values, and TTL settings for critical domains.',
    category: 'Networking',
    checks: [
      {
        service: 'Route53',
        type: 'RECORD_EXISTS',
        name: 'DNS Record Exists',
        parameters: {
          recordName: '',
          hostedZoneId: ''
        }
      },
      {
        service: 'Route53',
        type: 'DNS_POINTS_TO',
        name: 'DNS Points To Expected Value',
        parameters: {
          recordName: '',
          expectedValue: '',
          hostedZoneId: ''
        },
        operator: 'EQUALS'
      },
      {
        service: 'Route53',
        type: 'TTL_EQUALS',
        name: 'DNS TTL Check',
        parameters: {
          recordName: '',
          expectedTtl: 300,
          hostedZoneId: ''
        }
      },
      {
        service: 'NETWORK',
        type: 'HTTP_200',
        name: 'Domain HTTP Check',
        parameters: {
          url: ''
        }
      }
    ],
    parameterLabels: {
      'recordName': 'DNS Record Name (e.g., api.example.com)',
      'hostedZoneId': 'Route 53 Hosted Zone ID',
      'expectedValue': 'Expected DNS Value',
      'expectedTtl': 'Expected TTL (seconds)',
      'url': 'HTTP URL to verify'
    }
  }
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all available templates
 */
export function getAllTemplates(): CheckTemplate[] {
  return CHECK_TEMPLATES;
}

/**
 * Get a template by ID
 */
export function getTemplate(templateId: string): CheckTemplate | undefined {
  return CHECK_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Get templates filtered by category
 */
export function getTemplatesByCategory(category: string): CheckTemplate[] {
  return CHECK_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get all unique template categories
 */
export function getTemplateCategories(): string[] {
  return [...new Set(CHECK_TEMPLATES.map(t => t.category))];
}
