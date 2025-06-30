import dayjs, { Dayjs } from 'dayjs';
import { RecurrenceOptions } from '../types';

/**
 * Parse a recurrence rule string (RRULE format) into RecurrenceOptions
 */
export const parseRecurrenceRule = (rrule: string): RecurrenceOptions => {
  const options: RecurrenceOptions = {
    frequency: 'weekly',
    interval: 1,
  };

  if (!rrule) return options;

  const parts = rrule.split(';');
  
  for (const part of parts) {
    const [key, value] = part.split('=');
    
    switch (key) {
      case 'FREQ':
        options.frequency = value.toLowerCase() as 'daily' | 'weekly' | 'monthly' | 'yearly';
        break;
      case 'INTERVAL':
        options.interval = parseInt(value, 10) || 1;
        break;
      case 'UNTIL':
        // Parse YYYYMMDDTHHMMSSZ format
        const year = parseInt(value.substr(0, 4), 10);
        const month = parseInt(value.substr(4, 2), 10) - 1; // Month is 0-indexed
        const day = parseInt(value.substr(6, 2), 10);
        options.endDate = new Date(year, month, day);
        break;
      case 'COUNT':
        options.count = parseInt(value, 10);
        break;
      case 'BYDAY':
        // Parse days like MO,TU,WE
        const dayMap: Record<string, number> = {
          'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6
        };
        options.daysOfWeek = value.split(',').map(day => dayMap[day]).filter(d => d !== undefined);
        break;
    }
  }

  return options;
};

/**
 * Generate recurrence rule string from RecurrenceOptions
 */
export const generateRecurrenceRule = (options: RecurrenceOptions): string => {
  const { frequency, interval, endDate, count, daysOfWeek } = options;
  let rule = `FREQ=${frequency.toUpperCase()}`;

  if (interval && interval > 1) {
    rule += `;INTERVAL=${interval}`;
  }

  if (daysOfWeek && daysOfWeek.length > 0) {
    const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const selectedDays = daysOfWeek.map(day => days[day]).join(',');
    rule += `;BYDAY=${selectedDays}`;
  }

  if (endDate) {
    rule += `;UNTIL=${dayjs(endDate).format('YYYYMMDD')}T235959Z`;
  } else if (count) {
    rule += `;COUNT=${count}`;
  }

  return rule;
};

/**
 * Generate recurring event instances based on the recurrence rule
 */
export const generateRecurringInstances = (
  startDate: Date,
  endDate: Date,
  rrule: string,
  maxInstances: number = 100
): { start: Date; end: Date }[] => {
  const instances: { start: Date; end: Date }[] = [];
  const options = parseRecurrenceRule(rrule);
  const duration = dayjs(endDate).diff(dayjs(startDate));
  
  let currentDate = dayjs(startDate);
  let count = 0;
  const maxDate = options.endDate ? dayjs(options.endDate) : dayjs().add(2, 'years');
  
  while (count < maxInstances && currentDate.isBefore(maxDate)) {
    // Add current instance
    instances.push({
      start: currentDate.toDate(),
      end: currentDate.add(duration).toDate(),
    });
    
    count++;
    
    // Stop if we have a count limit and reached it
    if (options.count && count >= options.count) {
      break;
    }
    
    // Calculate next occurrence
    switch (options.frequency) {
      case 'daily':
        currentDate = currentDate.add(options.interval || 1, 'day');
        break;
      case 'weekly':
        if (options.daysOfWeek && options.daysOfWeek.length > 0) {
          // Find next day of week
          let nextDate = currentDate.add(1, 'day');
          let daysChecked = 0;
          
          while (daysChecked < 7 && !options.daysOfWeek.includes(nextDate.day())) {
            nextDate = nextDate.add(1, 'day');
            daysChecked++;
          }
          
          currentDate = nextDate;
        } else {
          currentDate = currentDate.add((options.interval || 1) * 7, 'day');
        }
        break;
      case 'monthly':
        currentDate = currentDate.add(options.interval || 1, 'month');
        break;
      case 'yearly':
        currentDate = currentDate.add(options.interval || 1, 'year');
        break;
    }
  }
  
  return instances;
};

/**
 * Check if a date matches the recurrence pattern
 */
export const matchesRecurrencePattern = (
  date: Date,
  startDate: Date,
  rrule: string
): boolean => {
  const options = parseRecurrenceRule(rrule);
  const startMoment = dayjs(startDate);
  const checkMoment = dayjs(date);
  
  // Check if date is before start date
  if (checkMoment.isBefore(startMoment, 'day')) {
    return false;
  }
  
  // Check end date
  if (options.endDate && checkMoment.isAfter(dayjs(options.endDate), 'day')) {
    return false;
  }
  
  // Check frequency and interval
  const diffDays = checkMoment.diff(startMoment, 'day');
  
  switch (options.frequency) {
    case 'daily':
      return diffDays % (options.interval || 1) === 0;
    case 'weekly':
      if (options.daysOfWeek && options.daysOfWeek.length > 0) {
        return options.daysOfWeek.includes(checkMoment.day());
      }
      return diffDays % ((options.interval || 1) * 7) === 0;
    case 'monthly':
      return (
        checkMoment.date() === startMoment.date() &&
        (checkMoment.diff(startMoment, 'month') % (options.interval || 1)) === 0
      );
    case 'yearly':
      return (
        checkMoment.date() === startMoment.date() &&
        checkMoment.month() === startMoment.month() &&
        (checkMoment.diff(startMoment, 'year') % (options.interval || 1)) === 0
      );
    default:
      return false;
  }
};

/**
 * Get a human-readable description of the recurrence rule
 */
export const getRecurrenceDescription = (rrule: string): string => {
  if (!rrule) return 'Does not repeat';
  
  const options = parseRecurrenceRule(rrule);
  const { frequency, interval, daysOfWeek, endDate, count } = options;
  
  let description = '';
  
  // Base frequency
  switch (frequency) {
    case 'daily':
      description = interval === 1 ? 'Daily' : `Every ${interval} days`;
      break;
    case 'weekly':
      if (daysOfWeek && daysOfWeek.length > 0) {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const selectedDays = daysOfWeek.map(d => dayNames[d]).join(', ');
        description = `Weekly on ${selectedDays}`;
      } else {
        description = interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
      }
      break;
    case 'monthly':
      description = interval === 1 ? 'Monthly' : `Every ${interval} months`;
      break;
    case 'yearly':
      description = interval === 1 ? 'Yearly' : `Every ${interval} years`;
      break;
  }
  
  // Add end condition
  if (count) {
    description += `, ${count} times`;
  } else if (endDate) {
    description += `, until ${dayjs(endDate).format('MMM D, YYYY')}`;
  }
  
  return description;
}; 