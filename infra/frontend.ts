import { api } from "./api";
import { auth, authClient } from "./auth";

export const frontend = new sst.aws.StaticSite("Frontend", {
  path: "packages/frontend",
  build: {
    command: "pnpm run build",
    output: "dist",
  },
  environment: {
    VITE_API_URL: api.url,
    VITE_USER_POOL_ID: auth.id,
    VITE_USER_POOL_CLIENT_ID: authClient.id,
  },
});
