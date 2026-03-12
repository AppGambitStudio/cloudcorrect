Backend:
- Node.js
- TypeScript
- Express.js
- AWS SDK
- Postgres

Frontend:
- React
- TypeScript
- AWS Amplify
- AWS Cognito
- AWS S3

AWS Account On-boarding:
- Cloudformation stack with ReadOnlyAccess policy

Multi-tenant:
- Each tenant is automatically created on user signup
- The signed-up user will be added to the tenant as an admin
- Each account can on-board multiple AWS accounts
- Each AWS account can be associated with only one tenant
- Each tenant has its own set of Invariant Groups
- Each Invariant Group can have multiple checks
- Each check has a scope (GLOBAL or REGIONAL)
- Each check has a type (e.g. INSTANCE_RUNNING, DNS_POINTS_TO)
- Each check has a set of parameters