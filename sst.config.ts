/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "cloudcorrect",
      removal: input?.stage === "prod" ? "retain" : "remove",
      protect: ["prod"].includes(input?.stage || ""),
      home: "aws",
    };
  },
  async run() {
    const { mainTable, evaluationsTable } = await import("./infra/database");
    const { auth, authClient } = await import("./infra/auth");
    const { api } = await import("./infra/api");
    const { evaluationQueue } = await import("./infra/scheduler");
    await import("./infra/mcp");
    const { frontend } = await import("./infra/frontend");

    return {
      api: api.url,
      userPoolId: auth.id,
      userPoolClientId: authClient.id,
    };
  },
});
