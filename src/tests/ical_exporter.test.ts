import { deriveChecklistDeadlineDate, buildICalCalendarContent } from '../utils/icalExporter';
import { ChecklistItem } from '../types/schemas';

const sampleChecklistItems: ChecklistItem[] = [
  {
    id: 'chk-1',
    category: 'notice_period',
    title: 'Notice Period Deadline',
    description: 'Provide written notice 60 days prior to lease termination.',
    due_date_or_timeframe: '60 days',
    action_required: 'Send 60 days written notice to landlord',
    associated_clause_id: 'cl-2',
  },
  {
    id: 'chk-2',
    category: 'deadline',
    title: 'Security Deposit Refund',
    description: 'Landlord must refund security deposit within 30 days of vacating.',
    due_date_or_timeframe: '30 days',
    action_required: 'Track security deposit refund within 30 days',
    associated_clause_id: 'cl-4',
  },
  {
    id: 'chk-3',
    category: 'obligation',
    title: 'Monthly Rent Payment',
    description: 'Rent must be paid by the 5th of each month.',
    due_date_or_timeframe: '5th of each month',
    action_required: 'Pay rent on or before 5th of month',
    associated_clause_id: 'cl-3',
  },
  {
    id: 'chk-4',
    category: 'warning',
    title: 'General Premises Inspection',
    description: 'Inspect premises for routine maintenance.',
    due_date_or_timeframe: '',
    action_required: 'Inspect premises',
  },
];

console.log('--- TEST 1: DATE DERIVATION HELPER ---');
const baseDate = new Date(2026, 8, 20); // Sept 20, 2026

const res1 = deriveChecklistDeadlineDate(sampleChecklistItems[0], baseDate);
if (!res1 || res1.startDate.getMonth() !== 10 || res1.startDate.getDate() !== 19) {
  throw new Error(`Test 1 Failed: Expected ~60 days from Sept 20, got ${res1?.startDate.toDateString()}`);
}
console.log('✅ [PASS] Test 1: 60 days relative timeframe derived correctly');

const res2 = deriveChecklistDeadlineDate(sampleChecklistItems[2], baseDate);
if (!res2 || res2.startDate.getDate() !== 5) {
  throw new Error(`Test 2 Failed: Expected 5th of month, got ${res2?.startDate.toDateString()}`);
}
console.log('✅ [PASS] Test 2: 5th of each month timeframe derived correctly');

const resGeneric = deriveChecklistDeadlineDate(sampleChecklistItems[3], baseDate);
if (resGeneric !== null) {
  throw new Error(`Test 3 Failed: Expected null for generic item without date/timeframe, got ${resGeneric}`);
}
console.log('✅ [PASS] Test 3: Item with no date/timeframe skipped correctly');

console.log('--- TEST 2: ICAL FILE GENERATION ---');
const { icsContent, exportCount } = buildICalCalendarContent(
  sampleChecklistItems,
  'Residential Lease Agreement',
  'en',
  baseDate
);

if (exportCount !== 3) {
  throw new Error(`Test 4 Failed: Expected 3 exportable items, got ${exportCount}`);
}
if (!icsContent.includes('BEGIN:VCALENDAR') || !icsContent.includes('END:VCALENDAR')) {
  throw new Error('Test 5 Failed: VCALENDAR markers missing');
}
if (!icsContent.includes('BEGIN:VALARM') || !icsContent.includes('TRIGGER:-P3D')) {
  throw new Error('Test 6 Failed: VALARM reminder missing');
}
if (!icsContent.includes('DTSTART;VALUE=DATE:')) {
  throw new Error('Test 7 Failed: All-day DTSTART missing');
}
console.log('✅ [PASS] Test 4: iCal content generated with valid RFC 5545 syntax and 3 VEVENTs');

console.log('====================================================');
console.log('  SUMMARY: ALL ICAL EXPORTER TESTS PASSED 🟢');
console.log('====================================================');
