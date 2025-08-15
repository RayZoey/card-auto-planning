import {ArgumentMetadata, Injectable, PipeTransform} from '@nestjs/common';
import {BadRequestException} from '@nestjs/common';
import {validateSync} from 'class-validator';
import {plainToClass} from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform {
  async transform(value: any, {metatype}: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    const object = plainToClass(metatype, value);
    const errors = validateSync(object);

    if (errors.length > 0) {
      throw new BadRequestException(errors[0].toString());
    }
    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
