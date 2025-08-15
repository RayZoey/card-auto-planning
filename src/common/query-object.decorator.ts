export function Column(column) {
  return function (target: any, key: string) {
    Reflect.defineMetadata('column', column, target, key);
  };
}

export function Operation(operation: 'lte' | 'gte' | 'lt' | 'gt' | 'in' | 'equals' | 'contains') {
  return function (target: any, key: string) {
    Reflect.defineMetadata('operation', operation, target, key);
  };
}
