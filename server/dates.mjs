export function today(
  timeZone = process.env.AI_GYM_TIMEZONE || 'America/Toronto',
) {
  const fields = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(new Date());
  const part = (type) => fields.find((field) => field.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

// Calendar arithmetic in UTC avoids DST adding/removing a date from recurrence.
export function addDays(date, count) {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + count);
  return result.toISOString().slice(0, 10);
}

export const dayOfWeek = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();
