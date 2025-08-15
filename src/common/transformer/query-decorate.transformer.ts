import {Transform} from 'class-transformer';

export function ToArray() {
  return Transform(({value}) => {
    if (undefined == value) {
      return undefined;
    } else if (!Array.isArray(value)) {
      return [value];
    }
    return value;
  });
}
export function ToBoolean() {
  return Transform(({value}) => {
    if (value) {
      if (value == 'true') {
        return true;
      } else if (value == 'false') {
        return false;
      }
    } else {
      return undefined;
    }
    return value;
  });
}
