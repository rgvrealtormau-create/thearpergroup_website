// Server-only: email a lead to Brivity's lead-parsing address via Resend.
// Uses Resend's REST API directly (no SDK dependency).
//
// Brivity's lead parser reads hidden <meta name="lead_*"> tags in the HTML body
// (format sent by Brivity support, Oct 2026, from a realtor.com example). A plain-text
// email is delivered but never becomes a lead, so the HTML part carries the tags and
// the plain-text part stays as a human-readable fallback.

import { randomUUID } from 'node:crypto';

const DEFAULT_TO = 'j_mauricio_arredondo@mail.brivity.com'; // Mauricio, Agent User ID 510286.

function attr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

export function brivityLeadHtml(lead) {
  const fields = [
    ['lead_id', lead.id],
    ['lead_name', [lead.firstName, lead.lastName].filter(Boolean).join(' ')],
    ['lead_first_name', lead.firstName],
    ['lead_last_name', lead.lastName],
    ['lead_email', lead.email],
    ['lead_phone', lead.phone],
    ['lead_property_address', lead.propertyAddress],
    ['lead_property_city', lead.propertyCity],
    ['lead_property_state', lead.propertyAddress || lead.propertyCity ? lead.propertyState || 'TX' : ''],
    ['lead_property_zip', lead.propertyZip],
    ['lead_property_price', lead.propertyPrice],
    ['lead_type', lead.type],
    ['lead_source', lead.source],
    ['lead_message', lead.note],
  ];
  const metas = fields
    .filter(([, value]) => value != null && String(value).trim() !== '')
    .map(([name, value]) => `<meta name="${name}" content="${attr(value)}">`)
    .join('\n');
  const visible = fields
    .filter(([name, value]) => name !== 'lead_id' && value != null && String(value).trim() !== '')
    .map(([name, value]) => `<p><b>${name.replace('lead_', '').replace(/_/g, ' ')}:</b> ${attr(value)}</p>`)
    .join('\n');
  return `<html><head>\n${metas}\n</head><body>\n${visible}\n</body></html>`;
}

export async function sendBrivityEmail({
  firstName, lastName, email, phone, note,
  type = 'Buyer',
  source = 'thearpergroup.com',
  propertyAddress, propertyCity, propertyState, propertyZip, propertyPrice,
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');

  const to = process.env.BRIVITY_LEAD_EMAIL || DEFAULT_TO;
  // Must be a domain verified in Resend.
  const from = process.env.LEAD_FROM_EMAIL || 'The Arper Group Website <leads@thearpergroup.com>';

  const lead = {
    id: randomUUID(), firstName, lastName, email, phone, note, type, source,
    propertyAddress, propertyCity, propertyState, propertyZip, propertyPrice,
  };

  const text = [
    `First Name: ${firstName}`,
    `Last Name:  ${lastName}`,
    `Email:      ${email || ''}`,
    `Phone:      ${phone || ''}`,
    `Type:       ${type}`,
    `Source:     ${source}`,
    propertyAddress ? `Property:   ${[propertyAddress, propertyCity].filter(Boolean).join(', ')}` : null,
    `Note:       ${note}`,
  ].filter(Boolean).join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: `New website lead — ${firstName} ${lastName}`.trim(),
      html: brivityLeadHtml(lead),
      text,
    }),
  });
  if (!res.ok) throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
  return res.json();
}
