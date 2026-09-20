import { ChecklistItem } from '../types/schemas';

export interface DerivedDeadlineDate {
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
}

/**
 * Derives a target deadline date for a checklist item based on its timeframe string or text content.
 * Returns null if no reliable date or timeframe can be derived.
 */
export function deriveChecklistDeadlineDate(
  item: ChecklistItem,
  baseDate: Date = new Date()
): DerivedDeadlineDate | null {
  const timeframe = (item.due_date_or_timeframe || '').trim();
  const combinedText = `${timeframe} ${item.title || ''} ${item.description || ''}`;
  if (!combinedText.trim()) return null;

  // 1. Check for absolute ISO or standard date format (e.g. 2026-10-15 or 2026/10/15)
  const isoMatch = combinedText.match(/\b(20\d\d)[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const start = new Date(year, month, day);
    const end = new Date(year, month, day + 1);
    return { startDate: start, endDate: end, isAllDay: true };
  }

  // 2. Check for relative day count (e.g. "60 days", "30-day notice", "within 15 days", "60 दिनों")
  const daysMatch = combinedText.match(/(\d+)\s*(?:-|–|\s)?\s*(?:day|days|दिन|दिनों)/i);
  if (daysMatch) {
    const numDays = parseInt(daysMatch[1], 10);
    if (numDays > 0 && numDays <= 365) {
      const start = new Date(baseDate.getTime() + numDays * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: end, isAllDay: true };
    }
  }

  // 3. Check for month count (e.g. "2 months", "6 months notice", "2 महीने")
  const monthsMatch = combinedText.match(/(\d+)\s*(?:-|–|\s)?\s*(?:month|months|महीने|माह)/i);
  if (monthsMatch) {
    const numMonths = parseInt(monthsMatch[1], 10);
    if (numMonths > 0 && numMonths <= 36) {
      const start = new Date(baseDate);
      start.setMonth(start.getMonth() + numMonths);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: end, isAllDay: true };
    }
  }

  // 4. Check for day of month (e.g. "5th of each month", "1st of every month", "5th day")
  const dayOfMonthMatch = combinedText.match(/(\d+)(?:st|nd|rd|th)?\s*(?:of\s*(?:each|every)?\s*month|day of the month)/i);
  if (dayOfMonthMatch) {
    const targetDay = parseInt(dayOfMonthMatch[1], 10);
    if (targetDay >= 1 && targetDay <= 31) {
      const start = new Date(baseDate);
      if (start.getDate() >= targetDay) {
        start.setMonth(start.getMonth() + 1);
      }
      start.setDate(targetDay);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: end, isAllDay: true };
    }
  }

  // 5. If item has explicit due_date_or_timeframe present with non-empty value (e.g. "Notice Period", "Lock-in Period")
  if (timeframe.length > 0) {
    const start = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { startDate: start, endDate: end, isAllDay: true };
  }

  return null;
}

/**
 * Formats a Date object to YYYYMMDD string for iCal all-day events.
 */
function formatDateToICal(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Formats current Date to YYYYMMDDTHHMMSSZ string for iCal DTSTAMP.
 */
function formatUtcTimestampToICal(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
}

/**
 * Escapes special characters for iCalendar string values according to RFC 5545.
 */
function escapeICalText(str: string): string {
  return (str || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Builds a RFC 5545 valid .ics calendar content string from checklist items.
 */
export function buildICalCalendarContent(
  items: ChecklistItem[],
  documentTitle: string,
  language: 'en' | 'hi' = 'en',
  baseDate: Date = new Date()
): { icsContent: string; exportCount: number } {
  const isHi = language === 'hi';
  const now = new Date();
  const dtstamp = formatUtcTimestampToICal(now);
  const cleanDocTitle = documentTitle || (isHi ? 'कानूनी दस्तावेज़' : 'Legal Agreement');

  let validEventsCount = 0;
  const veventsArr: string[] = [];

  items.forEach((item, index) => {
    const derived = deriveChecklistDeadlineDate(item, baseDate);
    if (!derived) return;

    validEventsCount++;
    const uid = `legallens-item-${index + 1}-${now.getTime()}@legallens.app`;
    const dtStartStr = formatDateToICal(derived.startDate);
    const dtEndStr = formatDateToICal(derived.endDate);

    const summaryPrefix = isHi ? 'लीगललेंस समय सीमा: ' : 'LegalLens Deadline: ';
    const summary = escapeICalText(`${summaryPrefix}${item.title}`);

    let descriptionRaw = `${isHi ? 'कार्रवाई' : 'Action'}: ${item.action_required || item.description}`;
    if (item.due_date_or_timeframe) {
      descriptionRaw += ` | ${isHi ? 'समय सीमा' : 'Timeframe'}: ${item.due_date_or_timeframe}`;
    }
    descriptionRaw += ` | ${isHi ? 'दस्तावेज़' : 'Document'}: ${cleanDocTitle}`;
    const description = escapeICalText(descriptionRaw);

    const alarmSummary = escapeICalText(`${isHi ? 'रिमाइंडर: ' : 'Reminder: '}${item.title}`);

    const vevent = [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dtStartStr}`,
      `DTEND;VALUE=DATE:${dtEndStr}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'STATUS:CONFIRMED',
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${alarmSummary}`,
      'TRIGGER:-P3D',
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');

    veventsArr.push(vevent);
  });

  if (validEventsCount === 0) {
    return { icsContent: '', exportCount: 0 };
  }

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LegalLens//Legal Deadline Reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    veventsArr.join('\r\n'),
    'END:VCALENDAR\r\n',
  ].join('\r\n');

  return { icsContent, exportCount: validEventsCount };
}
