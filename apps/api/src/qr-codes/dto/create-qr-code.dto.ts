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

  @IsOptional()
  @IsString()
  @MaxLength(240)
  imagePath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
