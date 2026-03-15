import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";

Amplify.configure(
  {
    API: {
      GraphQL: {
        endpoint: process.env.NEXT_PUBLIC_APPSYNC_URL!,
        region: process.env.NEXT_PUBLIC_AWS_REGION ?? "us-east-1",
        defaultAuthMode: "apiKey",
        apiKey: process.env.NEXT_PUBLIC_APPSYNC_API_KEY!,
      },
    },
  },
  { ssr: true },
);

export const appsyncClient = generateClient();
