import { SendEmailCommand } from "@aws-sdk/client-ses";
import { AWSAdapter } from "../adapters/aws-adapter.js";
import { getAccount } from "../dynamo/accounts.js";
import type { InvariantGroup, AWSAccount } from "../types/entities.js";
import type { CheckResult } from "./evaluation.js";

export const dispatchAlert = async (
  group: InvariantGroup,
  results: CheckResult[],
  account?: AWSAccount,
) => {
  const failedChecks = results.filter((r) => r.status === "FAIL");

  const alertPayload = {
    group: group.name,
    status: group.lastStatus,
    failedChecks: failedChecks.map((c) => ({
      checkId: c.checkId,
      alias: c.alias,
      reason: c.reason,
      expected: c.expected,
      observed: c.observed,
    })),
    timestamp: new Date().toISOString(),
  };

  console.log("--- ALERT DISPATCHER ---");
  console.log(JSON.stringify(alertPayload, null, 2));
  console.log("------------------------");

  if (group.notificationEmails && group.lastStatus === "FAIL") {
    await sendEmailNotification(group, failedChecks, account);
  }
};

async function sendEmailNotification(
  group: InvariantGroup,
  failedChecks: CheckResult[],
  account?: AWSAccount,
) {
  const emails = (group.notificationEmails ?? "")
    .split(",")
    .map((e: string) => e.trim())
    .filter((e: string) => e.length > 0);
  if (emails.length === 0) return;

  try {
    let resolvedAccount = account;
    if (!resolvedAccount) {
      resolvedAccount = (await getAccount(
        group.tenantId,
        group.awsAccountId,
      )) as AWSAccount;
    }
    if (!resolvedAccount)
      throw new Error("AWS Account not found for notification");

    const credentials = await AWSAdapter.getCredentials(resolvedAccount);
    const sesClient = await AWSAdapter.getSESClient(
      credentials,
      "us-east-1",
    );

    const subject = `${group.name} Evaluation Failed`;

    let htmlBody = `
            <h2>Architectural Invariant Groups Failure</h2>
            <p>The following checks failed for group: <strong>${group.name}</strong></p>
            <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th>Alias</th>
                        <th>Type</th>
                        <th>Observed</th>
                        <th>Expected</th>
                        <th>Reason</th>
                    </tr>
                </thead>
                <tbody>
        `;

    failedChecks.forEach((check) => {
      htmlBody += `
                <tr>
                    <td>${check.alias || "N/A"}</td>
                    <td>${check.checkId}</td>
                    <td>${check.observed}</td>
                    <td>${check.expected}</td>
                    <td style="color: #dc3545;">${check.reason}</td>
                </tr>
            `;
    });

    htmlBody += `
                </tbody>
            </table>
            <p>View full details in the <a href="${process.env.APP_URL || "http://localhost:8800"}/groups/${group.id}">Dashboard</a>.</p>
        `;

    const command = new SendEmailCommand({
      Destination: { ToAddresses: emails },
      Message: {
        Subject: { Data: subject },
        Body: {
          Html: { Data: htmlBody },
          Text: {
            Data: `The evaluation for group ${group.name} failed. Check details in the dashboard.`,
          },
        },
      },
      Source:
        process.env.SES_SENDER_EMAIL || "no-reply@appgambit.com",
    });

    await sesClient.send(command);
    console.log(`Notification email sent to: ${emails.join(", ")}`);
  } catch (error: any) {
    console.error(
      "Failed to send SES notification:",
      error.message,
    );
  }
}
