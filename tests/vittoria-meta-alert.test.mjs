import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

// lib/vittoriaEmail.js imports './site' without an extension, which Next resolves; teach Node the same.
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(specifier, context, next) {
  if (/^\\.{1,2}\\//.test(specifier) && !/\\.[cm]?js$/.test(specifier)) {
    try { return await next(specifier + '.js', context); } catch {}
  }
  return next(specifier, context);
}`));

const { vittoriaLeadAlert } = await import('../lib/vittoriaEmail.js');
const { splitAnswers, callTimeAnswer, agentAnswer } = await import('../lib/metaLeadAds.js');

// The exact shape the v3 Vittoria forms send (Apps Script `detail`, sheet column P is the last answer).
const EN = (agent, reach) => `when are you hoping to move: in the next 30 days; are you working with a real estate agent: ${agent}; have you talked to a lender yet: not yet; what's the best way to go over your move-in numbers: ${reach}`;
const ES = (agent, reach) => `¿cuándo te gustaría mudarte: en 3 a 6 meses; ¿ya trabajas con un agente de bienes raíces: ${agent}; ¿ya hablaste con un prestamista: todavía no; ¿cuál es la mejor manera de revisar tus números: ${reach}`;
const base = { formType: 'vittoria_meta_ad', name: 'Ana Garza', phone: '9565550100', email: '', source: 'Meta Ad — Vittoria', submittedAt: '11/9/2026, 9:00:00 AM' };

test('the v3 call-time answer is found in English and Spanish', () => {
  assert.equal(callTimeAnswer(splitAnswers(EN('no', 'weekend'))), 'weekend');
  assert.equal(callTimeAnswer(splitAnswers(ES('no', 'lo antes posible'))), 'lo antes posible');
  // North Park's label still works.
  assert.equal(callTimeAnswer(splitAnswers('timeline: 1-3 months; call time: weekday evenings; consent: yes')), 'weekday evenings');
});

test('the agent answer is read as yes / sí / no', () => {
  assert.equal(agentAnswer(splitAnswers(EN('yes', 'weekend'))).hasAgent, true);
  assert.equal(agentAnswer(splitAnswers(ES('sí', 'fin de semana'))).hasAgent, true);
  assert.equal(agentAnswer(splitAnswers(ES('si', 'fin de semana'))).hasAgent, true);
  assert.equal(agentAnswer(splitAnswers(EN('no', 'weekend'))).hasAgent, false);
  assert.equal(agentAnswer(splitAnswers(ES('no', 'fin de semana'))).hasAgent, false);
  assert.equal(agentAnswer(splitAnswers('when are you hoping to move: soon')), null);
});

test('a Meta lead with an agent: YES in the alert and HAS AGENT in the subject', () => {
  const a = vittoriaLeadAlert({ ...base, lang: 'en', detail: EN('yes', 'weekend') });
  assert.equal(a.subject, 'New Vittoria lead: Ana Garza — HAS AGENT');
  assert.match(a.text, /Buyer has an agent: YES — answered "yes" on the Meta form/);
  assert.match(a.text, /Best time \/ way to reach: weekend/);
  assert.match(a.html, /<b>weekend<\/b>/);
});

test('a Spanish Meta lead without an agent: No, with the call time', () => {
  const a = vittoriaLeadAlert({ ...base, lang: 'es', detail: ES('no', 'lo antes posible') });
  assert.equal(a.subject, 'New Vittoria lead: Ana Garza');
  assert.match(a.text, /Buyer has an agent: No\n/);
  assert.match(a.text, /Best time \/ way to reach: lo antes posible/);
});

test('website Vittoria forms keep using the buyerAgent field, with no call-time line', () => {
  const withAgent = vittoriaLeadAlert({ ...base, formType: 'vittoria', lang: 'en', buyerAgent: 'Jane Doe', detail: '' });
  assert.equal(withAgent.subject, 'New Vittoria lead: Ana Garza — HAS AGENT');
  assert.match(withAgent.text, /Buyer has an agent: YES — Jane Doe/);
  assert.doesNotMatch(withAgent.text, /Best time/);
  const without = vittoriaLeadAlert({ ...base, formType: 'vittoria', lang: 'en', detail: '' });
  assert.match(without.text, /Buyer has an agent: No\n/);
});
