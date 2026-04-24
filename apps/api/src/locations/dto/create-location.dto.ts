import { LocationType } from '@lbrtw/shared';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLocationDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsString()
  @MaxLength(80)
  code!: string;

  @IsEnum(LocationType)
  type!: LocationType;

  @IsOptional()
  @IsString()
  parentId?: string;
}
