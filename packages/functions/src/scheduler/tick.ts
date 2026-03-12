import { Handler } from "aws-lambda";
import { Resource } from "sst";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import {
  getSchedulerDueGroups,
  updateNextRunAt,
} from "@cloudcorrect/core";

const sqs = new SQSClient({});

export const handler: Handler = async () => {
  const now = new Date();
  const dueGroups = await getSchedulerDueGroups(now.toISOString());

  console.log(`Scheduler tick: found ${dueGroups.length} due group(s)`);

  let dispatched = 0;

  for (const group of dueGroups) {
    try {
      // Update nextRunAt BEFORE sending to SQS to prevent duplicate dispatch
      const nextRunAt = new Date(
        now.getTime() + group.intervalMinutes * 60_000,
      ).toISOString();
      await updateNextRunAt(group.tenantId, group.id, nextRunAt);

      await sqs.send(
        new SendMessageCommand({
          QueueUrl: Resource.EvaluationQueue.url,
          MessageBody: JSON.stringify({
            tenantId: group.tenantId,
            groupId: group.id,
          }),
        }),
      );

      dispatched++;
    } catch (error) {
      console.error(
        `Error dispatching group ${group.id}:`,
        error,
      );
    }
  }

  console.log(`Scheduler tick: dispatched ${dispatched}/${dueGroups.length} group(s)`);
};
