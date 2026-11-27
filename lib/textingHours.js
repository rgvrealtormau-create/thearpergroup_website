// When a lead may reach Brivity. A lead arrives in Brivity when this site emails Brivity's
// lead parser, and that starts the lead's ARPER auto plan, whose first text can go out at
// once; Brivity has no quiet hours for plan texts. So the Brivity lead email only goes out
// inside Mauricio's texting window (the call-hours rule in his plans, after Texas telephone
// solicitation hours), America/Chicago:
//
//   Monday to Saturday  9:00 am to 9:00 pm
//   Sunday             12:00 pm to 9:00 pm
//
// Outside it, the email is scheduled (Resend's scheduled_at) for the start of the next window.
// Everything else about a lead (team alert, the lead's own email, sheet, portal) is immediate.

const TZ = 'America/Chicago';
const CLOSE = 21 * 60; // 9:00 pm, in minutes after midnight
const openAt = (weekday) => (weekday === 0 ? 12 * 60 : 9 * 60); // 0 = Sunday

const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const parts = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, hourCycle: 'h23', weekday: 'short',
  year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
});

// The wall clock in McAllen at `date`.
function chicago(date) {
  const p = Object.fromEntries(parts.formatToParts(date).map(({ type, value }) => [type, value]));
  return {
    year: +p.year, month: +p.month, day: +p.day,
    hour: +p.hour % 24, minute: +p.minute, second: +p.second,
    weekday: WEEKDAYS[p.weekday],
  };
}

// The instant when McAllen's clock reads year-month-day hour:minute. 9 am and noon are never
// inside a daylight-saving jump (those happen at 2 am), so one correction is always enough.
function fromChicago(year, month, day, hour, minute) {
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  let guess = wall;
  for (let i = 0; i < 2; i += 1) {
    const c = chicago(new Date(guess));
    const shown = Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute);
    guess += wall - shown;
  }
  return new Date(guess);
}

// null when `now` is inside the texting window (send right away), otherwise the Date the
// next window opens.
export function nextTextingWindow(now = new Date()) {
  const c = chicago(now);
  const minutes = c.hour * 60 + c.minute;
  const opens = openAt(c.weekday);
  if (minutes >= opens && minutes < CLOSE) return null;
  if (minutes < opens) return fromChicago(c.year, c.month, c.day, Math.floor(opens / 60), opens % 60);
  // After 9 pm: tomorrow's opening (noon when tomorrow is Sunday).
  const tomorrow = new Date(Date.UTC(c.year, c.month - 1, c.day + 1));
  const next = openAt(tomorrow.getUTCDay());
  return fromChicago(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth() + 1, tomorrow.getUTCDate(), Math.floor(next / 60), next % 60);
}

// "Fri 9:00 AM" in McAllen time, for notes the team reads.
export function chicagoLabel(date) {
  return date.toLocaleString('en-US', { timeZone: TZ, weekday: 'short', hour: 'numeric', minute: '2-digit' });
}
