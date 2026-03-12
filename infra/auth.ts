import { mainTable } from "./database";

export const auth = new sst.aws.CognitoUserPool("Auth", {
  usernames: ["email"],
  triggers: {
    postConfirmation: {
      handler: "packages/functions/src/auth/post-confirm.handler",
      runtime: "nodejs22.x",
      architecture: "arm64",
      link: [mainTable],
      permissions: [
        {
          actions: ["cognito-idp:AdminUpdateUserAttributes"],
          resources: ["*"],
        },
      ],
    },
  },
  transform: {
    userPool: {
      passwordPolicy: {
        minimumLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSymbols: true,
      },
      schemas: [
        {
          name: "tenantId",
          attributeDataType: "String",
          mutable: true,
          stringAttributeConstraints: {
            maxLength: "64",
            minLength: "1",
          },
        },
      ],
      autoVerifiedAttributes: ["email"],
    },
  },
});

export const authClient = auth.addClient("AuthClient", {
  transform: {
    client: {
      explicitAuthFlows: [
        "ALLOW_USER_SRP_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH",
      ],
      generateSecret: false,
    },
  },
});
