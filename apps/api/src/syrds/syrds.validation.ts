import { BadRequestException } from '@nestjs/common';

const uidPattern = /^[1-9]\d{0,19}$/;
const datePattern = /^\d{8}$/;

export function assertValidUid(uid: string): void {
  if (!uidPattern.test(uid)) {
    throw new BadRequestException('uid must be a positive integer string with 1-20 digits and no leading zero');
  }
}

export function assertValidPageNum(pageNum: number): void {
  if (!Number.isInteger(pageNum) || pageNum < 1) {
    throw new BadRequestException('pageNum must be a positive integer');
  }
}

export function assertValidPageSize(pageSize: number): void {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new BadRequestException('pageSize must be an integer between 1 and 100');
  }
}

export function assertValidDate(value: string, fieldName: string): void {
  if (!datePattern.test(value)) {
    throw new BadRequestException(`${fieldName} must use YYYYMMDD format`);
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestException(`${fieldName} must be a real calendar date`);
  }
}

export function assertValidDateRange(startDt?: string, endDt?: string): void {
  if (startDt) {
    assertValidDate(startDt, 'start_dt');
  }
  if (endDt) {
    assertValidDate(endDt, 'end_dt');
  }
  if (startDt && endDt && startDt > endDt) {
    throw new BadRequestException('start_dt must be earlier than or equal to end_dt');
  }
}

