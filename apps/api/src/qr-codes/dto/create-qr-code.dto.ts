import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateQrCodeDto {
  @IsString()
  @MaxLength(160)
  token!: string;

  @IsString()
  @MaxLength(160)
  label!: string;

  @IsString()
  locationId!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
