import { IsISO8601, Matches } from 'class-validator';

const EXPLICIT_UTC_OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/;

export class AppointmentActionDto {
  @IsISO8601()
  @Matches(EXPLICIT_UTC_OFFSET, {
    message: 'expectedUpdatedAt must include Z or an explicit UTC offset',
  })
  expectedUpdatedAt!: string;
}
