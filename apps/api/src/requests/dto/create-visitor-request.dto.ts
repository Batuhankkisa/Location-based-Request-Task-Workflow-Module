import { RequestChannel } from '@lbrtw/shared';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVisitorRequestDto {
  @IsString()
  token!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  requestText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  transcriptText?: string;

  @IsOptional()
  @IsEnum(RequestChannel)
  channel?: RequestChannel;

  @IsOptional()
  @IsString()
  scanLogId?: string;
}
