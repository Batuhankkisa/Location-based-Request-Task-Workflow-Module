import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TransitionTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  changedBy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  assignedTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
