import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import ja from 'dayjs/locale/ja';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale(ja);
dayjs.extend(quarterOfYear);

export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const DATE_FORMAT = 'YYYY-MM-DD';
export const TIME_FORMAT = 'HH:mm';

export const setTime = (value?: string | Date) => (value ? dayjs(value) : dayjs());

export const isDayJs = (time: Dayjs) => dayjs.isDayjs(time);

export const getDaysBetween = (start: Dayjs, end: Dayjs) => {
  const range: Dayjs[] = [];
  let current = start;
  while (!current.isAfter(end)) {
    range.push(current);
    current = current.add(1, 'days');
  }
  return range;
};
