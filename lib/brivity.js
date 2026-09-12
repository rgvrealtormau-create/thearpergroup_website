// Server-only: email a lead to Brivity's lead-parsing address via Resend.
// Uses Resend's REST API directly (no SDK dependency).

const DEFAULT_TO = 'j_mauricio_arredondo@mail.brivity.com'; // Mauricio, Agent User ID 510286.

export async function sendBrivityEmail({ firstName, lastName, email, phone, note }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');

  const to = process.env.BRIVITY_LEAD_EMAIL || DEFAULT_TO;
  // Must be a domain verified in Resend.
  const from = process.env.LEAD_FROM_EMAIL || 'The Arper Group Website <leads@thearpergroup.com>';

  const text = [
    `First Name: ${firstName}`,
    `Last Name:  ${lastName}`,
    `Email:      ${email || ''}`,
    `Phone:      ${phone || ''}`,
    `Note:       ${note}`,
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: `New website lead — ${firstName} ${lastName}`.trim(),
      text,
    }),
  });
  if (!res.ok) throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
  return res.json();
}
