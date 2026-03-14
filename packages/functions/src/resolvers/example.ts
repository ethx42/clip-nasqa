import type { AppSyncResolverContext } from "@nasqa/core";

export const handler = async (event: AppSyncResolverContext) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello from Nasqa Live" }),
  };
};
