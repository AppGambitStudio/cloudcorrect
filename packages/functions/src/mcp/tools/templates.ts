/**
 * Server-side template definitions for MCP apply_template tool.
 * Ported from packages/frontend/src/lib/checkTemplates.ts
 */

import { createGroup, createCheck } from "@cloudcorrect/core";

interface TemplateCheck {
  service: string;
  type: string;
  name: string;
  scope: "GLOBAL" | "REGIONAL";
  parameters: Record<string, string | number | boolean>;
  operator?: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  checks: TemplateCheck[];
}

export const TEMPLATES: Template[] = [
  {
    id: "security-baseline",
    name: "Security Baseline",
    description:
      "Essential security checks: S3 public access, RDS encryption, IAM role verification, default VPC detection.",
    category: "Security",
    checks: [
      {
        service: "S3",
        type: "S3_BUCKET_PUBLIC_ACCESS_BLOCKED",
        name: "S3 Bucket Public Access Blocked",
        scope: "GLOBAL",
        parameters: { bucketName: "" },
      },
      {
        service: "RDS",
        type: "RDS_PUBLIC_ACCESS_DISABLED",
        name: "RDS Public Access Disabled",
        scope: "GLOBAL",
        parameters: { dbInstanceIdentifier: "" },
      },
      {
        service: "RDS",
        type: "RDS_ENCRYPTION_ENABLED",
        name: "RDS Encryption Enabled",
        scope: "GLOBAL",
        parameters: { dbInstanceIdentifier: "" },
      },
      {
        service: "IAM",
        type: "ROLE_EXISTS",
        name: "IAM Role Exists",
        scope: "GLOBAL",
        parameters: { roleName: "" },
      },
      {
        service: "EC2",
        type: "DEFAULT_VPC",
        name: "No Default VPC",
        scope: "REGIONAL",
        parameters: { expectedCount: 0 },
        operator: "EQUALS",
      },
    ],
  },
  {
    id: "web-app-monitoring",
    name: "Web App Monitoring",
    description:
      "Monitor web app health: HTTP endpoints, ALB targets, ECS services, CloudFront distributions.",
    category: "Monitoring",
    checks: [
      {
        service: "NETWORK",
        type: "HTTP_200",
        name: "HTTP Health Check",
        scope: "GLOBAL",
        parameters: { url: "" },
      },
      {
        service: "ALB",
        type: "TARGET_GROUP_HEALTHY",
        name: "ALB Target Group Healthy",
        scope: "REGIONAL",
        parameters: { targetGroupArn: "", expectedCount: 2 },
      },
      {
        service: "ECS",
        type: "ECS_SERVICE_RUNNING",
        name: "ECS Service Running",
        scope: "REGIONAL",
        parameters: { clusterName: "", serviceName: "", expectedCount: 2 },
        operator: "GREATER_THAN_OR_EQUALS",
      },
      {
        service: "CloudFront",
        type: "DISTRIBUTION_ENABLED",
        name: "CloudFront Distribution Enabled",
        scope: "GLOBAL",
        parameters: { distributionId: "" },
      },
    ],
  },
  {
    id: "database-protection",
    name: "Database Protection",
    description:
      "Comprehensive database monitoring: RDS availability/encryption/public access, DynamoDB status/PITR/encryption.",
    category: "Database",
    checks: [
      {
        service: "RDS",
        type: "RDS_INSTANCE_AVAILABLE",
        name: "RDS Instance Available",
        scope: "GLOBAL",
        parameters: { dbInstanceIdentifier: "" },
      },
      {
        service: "RDS",
        type: "RDS_ENCRYPTION_ENABLED",
        name: "RDS Encryption Enabled",
        scope: "GLOBAL",
        parameters: { dbInstanceIdentifier: "" },
      },
      {
        service: "RDS",
        type: "RDS_PUBLIC_ACCESS_DISABLED",
        name: "RDS Public Access Disabled",
        scope: "GLOBAL",
        parameters: { dbInstanceIdentifier: "" },
      },
      {
        service: "DynamoDB",
        type: "TABLE_STATUS_ACTIVE",
        name: "DynamoDB Table Active",
        scope: "GLOBAL",
        parameters: { tableName: "" },
      },
      {
        service: "DynamoDB",
        type: "POINT_IN_TIME_RECOVERY_ENABLED",
        name: "DynamoDB PITR Enabled",
        scope: "GLOBAL",
        parameters: { tableName: "" },
      },
      {
        service: "DynamoDB",
        type: "ENCRYPTION_ENABLED",
        name: "DynamoDB Encryption Enabled",
        scope: "GLOBAL",
        parameters: { tableName: "" },
      },
    ],
  },
  {
    id: "dns-monitoring",
    name: "DNS Monitoring",
    description:
      "Monitor DNS configurations: record existence, DNS values, TTL settings, and domain HTTP checks.",
    category: "Networking",
    checks: [
      {
        service: "Route53",
        type: "RECORD_EXISTS",
        name: "DNS Record Exists",
        scope: "GLOBAL",
        parameters: { recordName: "", hostedZoneId: "" },
      },
      {
        service: "Route53",
        type: "DNS_POINTS_TO",
        name: "DNS Points To Expected Value",
        scope: "GLOBAL",
        parameters: { recordName: "", expectedValue: "", hostedZoneId: "" },
        operator: "EQUALS",
      },
      {
        service: "Route53",
        type: "TTL_EQUALS",
        name: "DNS TTL Check",
        scope: "GLOBAL",
        parameters: { recordName: "", expectedTtl: 300, hostedZoneId: "" },
      },
      {
        service: "NETWORK",
        type: "HTTP_200",
        name: "Domain HTTP Check",
        scope: "GLOBAL",
        parameters: { url: "" },
      },
    ],
  },
];

export async function applyTemplateToAccount(
  tenantId: string,
  awsAccountId: string,
  templateName: string,
  groupName?: string,
) {
  const template = TEMPLATES.find((t) => t.id === templateName);
  if (!template) {
    throw new Error(
      `Template "${templateName}" not found. Available: ${TEMPLATES.map((t) => t.id).join(", ")}`,
    );
  }

  const group = await createGroup(tenantId, {
    awsAccountId,
    name: groupName || template.name,
    description: template.description,
    enabled: true,
  });

  const checks = [];
  for (const tc of template.checks) {
    const check = await createCheck(tenantId, group.id, {
      service: tc.service as any,
      scope: tc.scope as any,
      type: tc.type,
      parameters: tc.parameters,
      operator: tc.operator as any,
      alias: tc.name,
    });
    checks.push(check);
  }

  return {
    group,
    checks,
    template: {
      id: template.id,
      name: template.name,
      description: template.description,
    },
  };
}
