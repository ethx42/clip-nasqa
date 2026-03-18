import { util, extensions } from '@aws-appsync/utils';

export function request(ctx) {
  return { payload: null };
}

export function response(ctx) {
  if (!ctx.args.sessionCode) {
    util.error("sessionCode is required", "Unauthorized");
  }
  extensions.setSubscriptionFilter(
    util.transform.toSubscriptionFilter({
      sessionCode: { eq: ctx.args.sessionCode }
    })
  );
  return null;
}
