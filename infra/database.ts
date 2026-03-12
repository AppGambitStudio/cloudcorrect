export const mainTable = new sst.aws.Dynamo("MainTable", {
  fields: {
    pk: "string",
    sk: "string",
    gsi1pk: "string",
    gsi1sk: "string",
    gsi2pk: "string",
    gsi2sk: "string",
  },
  primaryIndex: { hashKey: "pk", rangeKey: "sk" },
  globalIndexes: {
    gsi1: { hashKey: "gsi1pk", rangeKey: "gsi1sk" },
    gsi2: { hashKey: "gsi2pk", rangeKey: "gsi2sk" },
  },
  transform: {
    table: {
      name: `CloudCorrect-Main-${$app.stage}`,
      billingMode: "PAY_PER_REQUEST",
    },
  },
});

export const evaluationsTable = new sst.aws.Dynamo("EvaluationsTable", {
  fields: {
    pk: "string",
    sk: "string",
  },
  primaryIndex: { hashKey: "pk", rangeKey: "sk" },
  transform: {
    table: {
      name: `CloudCorrect-Evaluations-${$app.stage}`,
      billingMode: "PAY_PER_REQUEST",
    },
  },
});
