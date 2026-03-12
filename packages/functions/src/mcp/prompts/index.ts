import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  listAccountsByTenant,
  listGroupsByTenant,
  getGroup,
  listChecksByGroup,
  listRunsByGroup,
  getRunResults,
} from "@cloudcorrect/core";

export function registerPrompts(server: McpServer, tenantId: string) {
  // ── 1. setup_monitoring ──────────────────────────────────────────────────

  server.prompt(
    "setup_monitoring",
    "Guide the user through setting up monitoring for an AWS service",
    {
      service: z.string().describe("AWS service to monitor (e.g. EC2, RDS, S3, ECS, Lambda, DynamoDB)"),
      scenario: z.string().optional().describe("What to monitor — e.g. 'production web app', 'database backups'"),
    },
    async ({ service, scenario }) => {
      const accounts = await listAccountsByTenant(tenantId);
      const accountList = accounts.length > 0
        ? accounts.map((a) => `- ${a.name} (${a.awsAccountId})`).join("\n")
        : "No AWS accounts connected yet.";

      const scenarioLine = scenario
        ? `The user wants to monitor: ${scenario}`
        : "The user has not specified a particular scenario.";

      return {
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              `I want to set up monitoring for the AWS service: ${service}.`,
              scenarioLine,
              "",
              "Please help me by:",
              "1. Reading the cloudcorrect://check-types resource to list available check types for this service.",
              "2. Suggesting which checks to create based on my scenario and best practices.",
              "3. Here are my connected AWS accounts — ask which one to use:",
              accountList,
              "4. Offer to create a check group and the recommended checks using the create_group and create_check tools.",
              "",
              "Keep suggestions practical and focused on the most impactful checks first.",
            ].join("\n"),
          },
        }],
      };
    },
  );

  // ── 2. investigate_failure ───────────────────────────────────────────────

  server.prompt(
    "investigate_failure",
    "Investigate why a check group is failing and suggest fixes",
    {
      groupId: z.string().describe("The ID of the failing group to investigate"),
    },
    async ({ groupId }) => {
      const [group, checks, runsResult] = await Promise.all([
        getGroup(tenantId, groupId),
        listChecksByGroup(tenantId, groupId),
        listRunsByGroup(tenantId, groupId, { limit: 5 }),
      ]);

      if (!group) {
        return {
          messages: [{
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Group "${groupId}" was not found. Please verify the group ID and try again.`,
            },
          }],
        };
      }

      // Fetch detailed results for each recent run
      const runDetails = await Promise.all(
        runsResult.items.map(async (run) => {
          const results = await getRunResults(tenantId, run.id);
          return { ...run, results };
        }),
      );

      return {
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              `Please investigate failures for the check group "${group.name}" (ID: ${groupId}).`,
              "",
              "## Group Configuration",
              JSON.stringify(group, null, 2),
              "",
              "## Active Checks",
              JSON.stringify(checks, null, 2),
              "",
              "## Last 5 Evaluation Runs",
              JSON.stringify(runDetails, null, 2),
              "",
              "## Analysis Request",
              "Please:",
              "1. Identify which specific checks are failing and why.",
              "2. Look for patterns across runs (intermittent vs. consistent failures).",
              "3. Suggest concrete fixes or configuration changes.",
              "4. If applicable, offer to update checks or parameters using the available tools.",
            ].join("\n"),
          },
        }],
      };
    },
  );

  // ── 3. compliance_report ─────────────────────────────────────────────────

  server.prompt(
    "compliance_report",
    "Generate a compliance summary report for your AWS accounts",
    {
      accountId: z.string().optional().describe("Specific AWS account ID to report on (omit for all accounts)"),
    },
    async ({ accountId }) => {
      const [accounts, groups] = await Promise.all([
        listAccountsByTenant(tenantId),
        listGroupsByTenant(tenantId),
      ]);

      const filteredGroups = accountId
        ? groups.filter((g) => g.awsAccountId === accountId)
        : groups;

      const accountInfo = accountId
        ? accounts.find((a) => a.awsAccountId === accountId || a.id === accountId)
        : null;

      const accountLabel = accountId
        ? accountInfo ? `${accountInfo.name} (${accountInfo.awsAccountId})` : accountId
        : "all accounts";

      // Fetch latest run for each group for status summary
      const groupSummaries = await Promise.all(
        filteredGroups.map(async (group) => {
          const { items } = await listRunsByGroup(tenantId, group.id, { limit: 1 });
          return {
            groupId: group.id,
            groupName: group.name,
            enabled: group.enabled,
            awsAccountId: group.awsAccountId,
            lastStatus: group.lastStatus,
            lastRun: items[0] ?? null,
          };
        }),
      );

      return {
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              `Generate a compliance report for ${accountLabel}.`,
              "",
              "## Connected AWS Accounts",
              JSON.stringify(accounts, null, 2),
              "",
              "## Check Groups and Latest Status",
              JSON.stringify(groupSummaries, null, 2),
              "",
              "## Report Request",
              "Please generate a compliance report that includes:",
              "1. An overview of all check groups and their current pass/fail status.",
              "2. A summary of pass/fail rates (total checks passing vs. failing).",
              "3. Highlight any groups that are currently failing or have been failing consistently.",
              "4. Identify any AWS accounts that have no monitoring groups set up.",
              "5. Provide recommendations for improving coverage.",
              "",
              "Format the report in a clear, executive-summary style with sections for each finding.",
            ].join("\n"),
          },
        }],
      };
    },
  );
}
