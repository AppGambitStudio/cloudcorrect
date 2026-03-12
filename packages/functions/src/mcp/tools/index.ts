import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  listAccountsByTenant,
  getAccount,
  createGroup,
  getGroup,
  listGroupsByTenant,
  updateGroup,
  toggleGroup,
  createCheck,
  updateCheck,
  listChecksByGroup,
  evaluateGroup,
  listRunsByGroup,
  getRunResults,
} from "@cloudcorrect/core";
import { CHECK_TYPES_REFERENCE } from "./checkTypesReference.js";
import { TEMPLATES, applyTemplateToAccount } from "./templates.js";

export function registerTools(server: McpServer, tenantId: string) {
  // ---------------------------------------------------------------------------
  // 1. list_aws_accounts
  // ---------------------------------------------------------------------------
  server.tool(
    "list_aws_accounts",
    "List all connected AWS accounts for this tenant",
    {},
    async () => {
      try {
        const accounts = await listAccountsByTenant(tenantId);
        const result = accounts.map((a) => ({
          id: a.id,
          name: a.name,
          awsAccountId: a.awsAccountId,
          region: a.region,
          authMethod: a.authMethod,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 2. list_groups
  // ---------------------------------------------------------------------------
  server.tool(
    "list_groups",
    "List all check groups, optionally filtered by AWS account",
    {
      awsAccountId: z
        .string()
        .optional()
        .describe("Filter groups by AWS account ID"),
    },
    async ({ awsAccountId }) => {
      try {
        let groups = await listGroupsByTenant(tenantId);
        if (awsAccountId) {
          groups = groups.filter((g) => g.awsAccountId === awsAccountId);
        }
        const result = groups.map((g) => ({
          id: g.id,
          name: g.name,
          enabled: g.enabled,
          lastStatus: g.lastStatus,
          intervalMinutes: g.intervalMinutes,
          nextRunAt: g.nextRunAt,
          awsAccountId: g.awsAccountId,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 3. get_group_detail
  // ---------------------------------------------------------------------------
  server.tool(
    "get_group_detail",
    "Get detailed information about a check group including its checks",
    {
      groupId: z.string().describe("The group ID to retrieve"),
    },
    async ({ groupId }) => {
      try {
        const group = await getGroup(tenantId, groupId);
        if (!group) {
          return {
            content: [{ type: "text", text: "Group not found" }],
            isError: true,
          };
        }
        const checks = await listChecksByGroup(tenantId, groupId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ...group, checks }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 4. create_group
  // ---------------------------------------------------------------------------
  server.tool(
    "create_group",
    "Create a new check group for an AWS account",
    {
      awsAccountId: z.string().describe("The AWS account ID to attach this group to"),
      name: z.string().describe("Name of the group"),
      description: z.string().optional().describe("Description of the group"),
      intervalMinutes: z
        .number()
        .optional()
        .describe("Evaluation interval in minutes (default 60)"),
      enabled: z.boolean().optional().describe("Whether the group is enabled (default true)"),
      notificationEmails: z
        .string()
        .optional()
        .describe("Comma-separated notification email addresses"),
    },
    async ({ awsAccountId, name, description, intervalMinutes, enabled, notificationEmails }) => {
      try {
        const group = await createGroup(tenantId, {
          awsAccountId,
          name,
          description,
          intervalMinutes,
          enabled,
          notificationEmails,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(group, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 5. evaluate_group
  // ---------------------------------------------------------------------------
  server.tool(
    "evaluate_group",
    "Run an evaluation on a check group immediately and return results",
    {
      groupId: z.string().describe("The group ID to evaluate"),
    },
    async ({ groupId }) => {
      try {
        const result = await evaluateGroup(tenantId, groupId);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 6. get_evaluation_history
  // ---------------------------------------------------------------------------
  server.tool(
    "get_evaluation_history",
    "Get past evaluation runs for a check group",
    {
      groupId: z.string().describe("The group ID"),
      limit: z.number().optional().describe("Number of runs to return (default 10)"),
    },
    async ({ groupId, limit }) => {
      try {
        const runs = await listRunsByGroup(tenantId, groupId, {
          limit: limit ?? 10,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(runs, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 7. create_check
  // ---------------------------------------------------------------------------
  server.tool(
    "create_check",
    "Create a new check in a group. Use get_check_types to see available services and check types.",
    {
      groupId: z.string().describe("The group ID to add the check to"),
      service: z
        .enum([
          "EC2", "ALB", "Route53", "IAM", "S3", "NETWORK",
          "RDS", "ECS", "DynamoDB", "Lambda", "CloudFront", "ConfigService",
        ])
        .describe("AWS service for this check"),
      scope: z
        .enum(["GLOBAL", "REGIONAL"])
        .describe("Whether the check is global or regional"),
      type: z.string().describe("Check type ID (e.g., INSTANCE_RUNNING, HTTP_200)"),
      region: z.string().optional().describe("AWS region (required for REGIONAL scope)"),
      parameters: z
        .record(z.unknown())
        .optional()
        .describe("Check parameters (varies by check type)"),
      operator: z
        .string()
        .optional()
        .describe("Comparison operator (EQUALS, GREATER_THAN, etc.)"),
      alias: z
        .string()
        .optional()
        .describe("Friendly name/alias for this check"),
    },
    async ({ groupId, service, scope, type, region, parameters, operator, alias }) => {
      try {
        const check = await createCheck(tenantId, groupId, {
          service: service as any,
          scope: scope as any,
          type,
          region,
          parameters,
          operator: operator as any,
          alias,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(check, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 8. update_check
  // ---------------------------------------------------------------------------
  server.tool(
    "update_check",
    "Update an existing check in a group",
    {
      groupId: z.string().describe("The group ID containing the check"),
      checkId: z.string().describe("The check ID to update"),
      service: z
        .enum([
          "EC2", "ALB", "Route53", "IAM", "S3", "NETWORK",
          "RDS", "ECS", "DynamoDB", "Lambda", "CloudFront", "ConfigService",
        ])
        .optional()
        .describe("Updated AWS service"),
      scope: z
        .enum(["GLOBAL", "REGIONAL"])
        .optional()
        .describe("Updated scope"),
      type: z.string().optional().describe("Updated check type ID"),
      region: z.string().optional().describe("Updated AWS region"),
      parameters: z
        .record(z.unknown())
        .optional()
        .describe("Updated check parameters"),
      operator: z
        .string()
        .optional()
        .describe("Updated comparison operator"),
      alias: z.string().optional().describe("Updated alias"),
    },
    async ({ groupId, checkId, service, scope, type, region, parameters, operator, alias }) => {
      try {
        const updates: Record<string, unknown> = {};
        if (service !== undefined) updates.service = service;
        if (scope !== undefined) updates.scope = scope;
        if (type !== undefined) updates.type = type;
        if (region !== undefined) updates.region = region;
        if (parameters !== undefined) updates.parameters = parameters;
        if (operator !== undefined) updates.operator = operator;
        if (alias !== undefined) updates.alias = alias;

        const check = await updateCheck(tenantId, groupId, checkId, updates as any);
        return {
          content: [{ type: "text", text: JSON.stringify(check, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 9. toggle_group
  // ---------------------------------------------------------------------------
  server.tool(
    "toggle_group",
    "Enable or disable a check group",
    {
      groupId: z.string().describe("The group ID to toggle"),
      enabled: z.boolean().describe("Set to true to enable, false to disable"),
    },
    async ({ groupId, enabled }) => {
      try {
        const group = await toggleGroup(tenantId, groupId, enabled);
        return {
          content: [{ type: "text", text: JSON.stringify(group, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 10. get_check_types
  // ---------------------------------------------------------------------------
  server.tool(
    "get_check_types",
    "List available AWS services and their check types with parameter definitions",
    {
      service: z
        .string()
        .optional()
        .describe("Filter by service ID (e.g., EC2, S3, RDS)"),
    },
    async ({ service }) => {
      try {
        let result = CHECK_TYPES_REFERENCE;
        if (service) {
          result = result.filter(
            (s) => s.service.toUpperCase() === service.toUpperCase(),
          );
        }
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 11. apply_template
  // ---------------------------------------------------------------------------
  server.tool(
    "apply_template",
    "Apply a pre-defined check template to create a group with checks. Use get_check_types to understand available templates.",
    {
      awsAccountId: z.string().describe("The AWS account ID to create the group in"),
      templateName: z
        .string()
        .describe(
          `Template name: ${TEMPLATES.map((t) => t.id).join(", ")}`,
        ),
      groupName: z
        .string()
        .optional()
        .describe("Custom name for the created group (defaults to template name)"),
    },
    async ({ awsAccountId, templateName, groupName }) => {
      try {
        const result = await applyTemplateToAccount(
          tenantId,
          awsAccountId,
          templateName,
          groupName,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 12. get_dashboard_summary
  // ---------------------------------------------------------------------------
  server.tool(
    "get_dashboard_summary",
    "Get an aggregated dashboard summary across all accounts and groups",
    {},
    async () => {
      try {
        const [accounts, groups] = await Promise.all([
          listAccountsByTenant(tenantId),
          listGroupsByTenant(tenantId),
        ]);

        let totalChecks = 0;
        let lastEvaluation: string | null = null;
        const statusCounts: Record<string, number> = {
          PASS: 0,
          FAIL: 0,
          PENDING: 0,
          ERROR: 0,
        };

        const checkCounts = await Promise.all(
          groups.map((g) => listChecksByGroup(tenantId, g.id)),
        );

        for (let i = 0; i < groups.length; i++) {
          const g = groups[i];
          totalChecks += checkCounts[i].length;

          const status = g.lastStatus || "PENDING";
          statusCounts[status] = (statusCounts[status] || 0) + 1;

          if (g.updatedAt && (!lastEvaluation || g.updatedAt > lastEvaluation)) {
            lastEvaluation = g.updatedAt;
          }
        }

        const summary = {
          totalAccounts: accounts.length,
          totalGroups: groups.length,
          groupsByStatus: statusCounts,
          totalChecks,
          lastEvaluation,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    },
  );
}
