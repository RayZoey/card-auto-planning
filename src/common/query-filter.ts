export interface QueryFilter {
  [key: string]: {
    lte?: string | number;
    gte?: string | number;
    in?: string[] | number[];
    equals?: string | number;
  };
}
