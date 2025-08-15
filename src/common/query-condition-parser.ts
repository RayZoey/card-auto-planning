import {Injectable} from '@nestjs/common';
import {QueryFilter} from './query-filter';

@Injectable()
export class QueryConditionParser {
  public parse(queryConditionObject): QueryFilter {
    const filter: QueryFilter = {};
    for (const key in queryConditionObject) {
      if (queryConditionObject[key] == undefined) {
        continue;
      }
      const operation = Reflect.getMetadata('operation', queryConditionObject, key);
      const column = Reflect.getMetadata('column', queryConditionObject, key);
      const condition = {[operation]: queryConditionObject[key]};
      if (filter[column]) {
        Object.assign(filter[column], condition);
      } else {
        filter[column] = condition;
      }
    }
    return filter;
  }
}
