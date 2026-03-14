export function request(ctx) {
  return { operation: 'GetItem', key: { PK: { S: '_stub' }, SK: { S: '_stub' } } };
}

export function response(ctx) {
  return null;
}
