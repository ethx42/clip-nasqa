import { util, extensions } from '@aws-appsync/utils';

export function request(ctx) {
  return { payload: null };
}

export function response(ctx) {
  if (!ctx.args.sessionSlug) {
    util.error("sessionSlug is required", "Unauthorized");
  }
  extensions.setSubscriptionFilter(
    util.transform.toSubscriptionFilter({
      sessionSlug: { eq: ctx.args.sessionSlug }
    })
  );
  return null;
}
