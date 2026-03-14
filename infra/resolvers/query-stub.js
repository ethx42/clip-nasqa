import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({ PK: '_stub', SK: '_stub' }),
  };
}

export function response(ctx) {
  return null;
}
