import { mainTable, evaluationsTable } from "./database";

// Dead-letter queue for failed evaluations
export const evaluationDlq = new sst.aws.Queue("EvaluationDlq", {
  transform: {
    queue: {
      name: `cloudcorrect-evaluation-dlq-${$app.stage}`,
    },
  },
});

// Main evaluation queue
export const evaluationQueue = new sst.aws.Queue("EvaluationQueue", {
  dlq: {
    queue: evaluationDlq.arn,
    retry: 3,
  },
  transform: {
    queue: {
      name: `cloudcorrect-evaluation-queue-${$app.stage}`,
      visibilityTimeoutSeconds: 180,
    },
  },
});

// SQS consumer — processes one evaluation at a time
evaluationQueue.subscribe(
  {
    handler: "packages/functions/src/scheduler/evaluate.handler",
    runtime: "nodejs22.x",
    architecture: "arm64",
    timeout: "120 seconds",
    link: [mainTable, evaluationsTable, evaluationQueue],
  },
  {
    batch: {
      size: 1,
    },
  },
);

// Cron tick — runs every minute, queries for due groups, pushes to SQS
new sst.aws.Cron("SchedulerTick", {
  schedule: "rate(1 minute)",
  function: {
    handler: "packages/functions/src/scheduler/tick.handler",
    runtime: "nodejs22.x",
    architecture: "arm64",
    timeout: "60 seconds",
    link: [mainTable, evaluationQueue],
  },
});
