import type { PostConfirmationTriggerHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { createTenant, createUser } from "@cloudcorrect/core";

const cognito = new CognitoIdentityProviderClient({});

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const email = event.request.userAttributes.email;
  const sub = event.request.userAttributes.sub;
  const tenantId = crypto.randomUUID();

  await createTenant({ id: tenantId, name: email.split("@")[0] });

  await createUser(tenantId, {
    cognitoSub: sub,
    email,
    role: "admin",
  });

  await cognito.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: event.userPoolId,
      Username: event.userName,
      UserAttributes: [
        { Name: "custom:tenantId", Value: tenantId },
      ],
    }),
  );

  return event;
};
