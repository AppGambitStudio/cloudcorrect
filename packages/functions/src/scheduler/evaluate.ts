import { SQSHandler } from "aws-lambda";
import { evaluateGroup, dispatchAlert, getGroup } from "@cloudcorrect/core";

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const { tenantId, groupId } = JSON.parse(record.body);

    console.log(`Evaluating group ${groupId} for tenant ${tenantId}`);

    const result = await evaluateGroup(tenantId, groupId);

    if (result.skipped) {
      console.log(`Skipped group ${groupId}: ${result.reason}`);
      continue;
    }

    if (result.changed || result.status === "FAIL") {
      const group = await getGroup(tenantId, groupId);
      if (group) {
        if (result.changed) {
          console.log(
            `Group ${groupId} status changed: ${result.oldStatus} -> ${result.status}`,
          );
        }
        await dispatchAlert(group, result.results);
      }
    }

    console.log(`Evaluation complete for group ${groupId}: ${result.status}`);
  }
};
