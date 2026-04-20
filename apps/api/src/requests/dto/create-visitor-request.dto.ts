import { RequestChannel } from '@lbrtw/shared';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVisitorRequestDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  requestText!: string;

  @IsOptional()
  @IsEnum(RequestChannel)
  channel?: RequestChannel;

  @IsOptional()
  @IsString()
  scanLogId?: string;
}
