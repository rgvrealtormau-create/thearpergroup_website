// Shared PDF template for every /resources calculator (one page for most; longer
// payloads, e.g. with a projection table, flow onto a second page).
// Client-only and never imported statically: ExportButton loads this module (and
// @react-pdf/renderer with it) on click, so it adds nothing to page weight.
// The template never knows which calculator it renders — it only reads the payload:
//   { calculator, lang, url, title, subtitle, label,
//     headline: { label, value, sub?, warning? },
//     metrics?: [{ label, value }],                       // small tiles under the headline
//     inputs: [{ label, value }], results: [{ label, value, emphasis?, indent? }],
//     tables?: [{ title, intro?, columns: [string], rows: [[string]], summary?, disclaimer? }],
//     notes: [string], dataStamps: [{ label, value }], disclaimers: [string] }
// Values arrive already formatted.

import { Document, Font, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import { exportCopy, footer as footerCopy } from '../content';
import { BUSINESS } from '../site';

// Halyard Display is embedded from public/fonts. The Larken files there are the foundry's
// DEMO builds (internal name "LarkenDEMO-Italic"), which must not be embedded in a document
// we hand out, so the title uses the reader's built-in Times italic for now. Once the
// licensed Larken .otf files replace them, add a Font.register for 'Larken' (300/400
// italic) below and set accent: 'Larken'.
const FONT = { sans: 'Halyard', accent: 'Times-Roman' };

let fontsRegisteredFor = null;
export function registerFonts(assetBase) {
  if (fontsRegisteredFor === assetBase) return;
  Font.register({
    family: FONT.sans,
    fonts: [
      { src: `${assetBase}/fonts/halyard-display-light.otf`, fontWeight: 300 },
      { src: `${assetBase}/fonts/halyard-display-regular.otf`, fontWeight: 400 },
      { src: `${assetBase}/fonts/halyard-display-medium.otf`, fontWeight: 500 },
    ],
  });
  fontsRegisteredFor = assetBase;
}

// Wrap on whole words only — react-pdf hyphenates by default, which splits narrow table headers.
Font.registerHyphenationCallback((word) => [word]);

const C = {
  petrol: '#2B4555',
  ink: '#2A2626',
  ink70: '#5F5A58',
  ink50: '#8C8784',
  rule: '#DDD6CA',
  cream: '#ECE5D7',
  paper: '#F7F3EC',
  gold: '#D7BC87',
};

const s = StyleSheet.create({
  // paddingTop gives continuation pages a top margin; the header cancels it on page 1.
  page: { backgroundColor: C.paper, color: C.ink, fontFamily: FONT.sans, fontSize: 9.5, paddingTop: 36, paddingBottom: 92 },
  header: { marginTop: -36, backgroundColor: C.petrol, paddingVertical: 20, paddingHorizontal: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wordmark: { width: 112, height: 22 },
  headerLabel: { color: C.cream, fontSize: 7.5, letterSpacing: 1.6, textTransform: 'uppercase' },
  body: { paddingHorizontal: 40, paddingTop: 22 },
  title: { fontFamily: FONT.accent, fontStyle: 'italic', fontSize: 26, color: C.ink },
  subtitle: { marginTop: 6, fontSize: 9.5, color: C.ink70, lineHeight: 1.45, maxWidth: 440 },
  headlineBox: { marginTop: 18, backgroundColor: C.cream, paddingVertical: 14, paddingHorizontal: 18, borderLeftWidth: 3, borderLeftColor: C.gold },
  eyebrow: { fontSize: 7.5, letterSpacing: 1.6, textTransform: 'uppercase', color: C.petrol },
  headlineValue: { marginTop: 6, fontSize: 30, color: C.ink },
  headlineSub: { marginTop: 3, fontSize: 9.5, color: C.ink70 },
  warning: { marginTop: 6, fontSize: 8.5, color: '#9B2C2C', lineHeight: 1.4 },
  metrics: { marginTop: 10, flexDirection: 'row', gap: 8 },
  metric: { flex: 1, backgroundColor: C.cream, paddingVertical: 9, paddingHorizontal: 10 },
  metricLabel: { fontSize: 6.5, letterSpacing: 1, textTransform: 'uppercase', color: C.ink70 },
  metricValue: { marginTop: 4, fontSize: 13, color: C.ink },
  columns: { marginTop: 18, flexDirection: 'row', gap: 28 },
  column: { flex: 1 },
  sectionHead: { paddingBottom: 6, borderBottomWidth: 0.75, borderBottomColor: C.rule },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3.5, fontSize: 9, borderBottomWidth: 0.5, borderBottomColor: C.rule },
  rowLabel: { color: C.ink70, flex: 1, paddingRight: 10 },
  rowValue: { color: C.ink, textAlign: 'right' },
  rowEmphasis: { fontWeight: 500 },
  rowIndentLabel: { color: C.ink50, paddingLeft: 10 },
  rowIndentValue: { color: C.ink70 },
  tableRow: { flexDirection: 'row', paddingVertical: 4.5, borderBottomWidth: 0.5, borderBottomColor: C.rule },
  tableHead: { fontSize: 6.5, letterSpacing: 0.8, textTransform: 'uppercase', color: C.ink70 },
  tableCell: { flex: 1, textAlign: 'right', paddingLeft: 6, fontSize: 8.5 },
  tableFirstCell: { flex: 1.3, textAlign: 'left', paddingLeft: 0 },
  pageNumber: { position: 'absolute', right: 40, bottom: 100, fontSize: 7.5, color: C.ink50 },
  block: { marginTop: 16 },
  note: { marginTop: 6, fontSize: 9.5, color: C.ink70, lineHeight: 1.45 },
  stamp: { marginTop: 4, fontSize: 8, color: C.ink70, lineHeight: 1.4 },
  stampLabel: { color: C.ink },
  disclaimer: { marginTop: 6, fontSize: 7.5, color: C.ink50, lineHeight: 1.45 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.petrol, paddingVertical: 16, paddingHorizontal: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 },
  footerCol: { color: C.cream, fontSize: 8, lineHeight: 1.5 },
  footerStrong: { color: C.cream, fontSize: 8.5 },
  footerMuted: { color: '#B9C2C7' },
  // TREC 22 TAC §535.155: the broker's name must be at least half the size of the largest
  // team name/contact info in the ad. The ARPER letters in the 22pt-tall header wordmark are
  // ~20.2pt; at 26pt tall, the ALLIANCE letters here are ~12.8pt (~63%). Keep that ratio
  // above 50% if either logo is resized.
  alliance: { width: 103, height: 26, marginBottom: 5 },
});

function Row({ label, value, emphasis, indent }) {
  const valueStyle = [s.rowValue, emphasis && s.rowEmphasis, indent && s.rowIndentValue].filter(Boolean);
  return (
    <View style={s.row} wrap={false}>
      <Text style={indent ? [s.rowLabel, s.rowIndentLabel] : s.rowLabel}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </View>
  );
}

function Table({ table }) {
  const cellStyle = (i) => (i === 0 ? [s.tableCell, s.tableFirstCell] : s.tableCell);
  return (
    // Kept whole (these tables are short) so the heading never strands at a page bottom.
    <View style={s.block} wrap={false}>
      <View style={s.sectionHead}><Text style={s.eyebrow}>{table.title}</Text></View>
      {table.intro ? <Text style={s.note}>{table.intro}</Text> : null}
      <View style={[s.tableRow, { marginTop: 6 }]} wrap={false}>
        {table.columns.map((c, i) => <Text key={c} style={[].concat(cellStyle(i), s.tableHead)}>{c}</Text>)}
      </View>
      {table.rows.map((row) => (
        <View key={row[0]} style={s.tableRow} wrap={false}>
          {row.map((cell, i) => <Text key={i} style={cellStyle(i)}>{cell}</Text>)}
        </View>
      ))}
      {table.summary ? <Text style={s.note}>{table.summary}</Text> : null}
      {table.disclaimer ? <Text style={s.disclaimer}>{table.disclaimer}</Text> : null}
    </View>
  );
}

function formatGenerated(date, lang) {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

export function ExportDocument({ payload, assetBase = '', generatedAt = new Date() }) {
  const lang = payload.lang === 'es' ? 'es' : 'en';
  const t = exportCopy[lang];
  const f = footerCopy[lang];
  const stamps = [{ label: t.generated, value: formatGenerated(generatedAt, lang) }, ...(payload.dataStamps || [])];

  return (
    <Document title={`${payload.title} — The Arper Group`} author="The Arper Group" language={lang}>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <Image src={`${assetBase}/brand/wordmark-cream.png`} style={s.wordmark} />
          <Text style={s.headerLabel}>{payload.label}</Text>
        </View>

        <View style={s.body}>
          <Text style={s.title}>{payload.title}</Text>
          {payload.subtitle ? <Text style={s.subtitle}>{payload.subtitle}</Text> : null}

          <View style={s.headlineBox}>
            <Text style={s.eyebrow}>{payload.headline.label}</Text>
            <Text style={s.headlineValue}>{payload.headline.value}</Text>
            {payload.headline.sub ? <Text style={s.headlineSub}>{payload.headline.sub}</Text> : null}
            {payload.headline.warning ? <Text style={s.warning}>{payload.headline.warning}</Text> : null}
          </View>

          {payload.metrics?.length ? (
            <View style={s.metrics}>
              {payload.metrics.map((m) => (
                <View key={m.label} style={s.metric}>
                  <Text style={s.metricLabel}>{m.label}</Text>
                  <Text style={s.metricValue}>{m.value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={s.columns}>
            <View style={s.column}>
              <View style={s.sectionHead}><Text style={s.eyebrow}>{t.yourNumbers}</Text></View>
              {payload.inputs.map((r) => <Row key={r.label} {...r} />)}
            </View>
            <View style={s.column}>
              <View style={s.sectionHead}><Text style={s.eyebrow}>{t.breakdown}</Text></View>
              {payload.results.map((r) => <Row key={r.label} {...r} />)}
            </View>
          </View>

          {(payload.tables || []).map((table) => <Table key={table.title} table={table} />)}

          {payload.notes?.length ? (
            <View style={s.block} minPresenceAhead={40}>
              <View style={s.sectionHead}><Text style={s.eyebrow}>{t.notes}</Text></View>
              {payload.notes.map((n) => <Text key={n} style={s.note}>{n}</Text>)}
            </View>
          ) : null}

          <View style={s.block} minPresenceAhead={40}>
            <View style={s.sectionHead}><Text style={s.eyebrow}>{t.dataStamps}</Text></View>
            {stamps.map((d) => (
              <Text key={d.label} style={s.stamp}>
                <Text style={s.stampLabel}>{d.label}: </Text>{d.value}
              </Text>
            ))}
            <Text style={[s.disclaimer, { color: C.ink70 }]}>{t.estimateOnly}</Text>
            {(payload.disclaimers || []).map((d) => <Text key={d} style={s.disclaimer}>{d}</Text>)}
          </View>
        </View>

        <View style={s.footer} fixed>
          <View style={[s.footerCol, { maxWidth: 190 }]}>
            <Image src={`${assetBase}/brand/alliance-white.png`} style={s.alliance} />
            <Text>{f.brokerLine}</Text>
          </View>
          <View style={s.footerCol}>
            <Text style={s.footerStrong}>{BUSINESS.name}</Text>
            <Text>{BUSINESS.street}</Text>
            <Text>{BUSINESS.city}, {BUSINESS.region} {BUSINESS.postalCode}</Text>
          </View>
          <View style={s.footerCol}>
            <Text>Mauricio {BUSINESS.phoneDisplay}</Text>
            <Text>Pamela {BUSINESS.phonePam}</Text>
            <Text style={s.footerMuted}>{t.recalculate}</Text>
            <Text style={s.footerMuted}>{payload.url.replace(/^https?:\/\/(www\.)?/, '')}</Text>
          </View>
        </View>
        <Text
          style={s.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) => (totalPages > 1 ? `${pageNumber} / ${totalPages}` : '')}
        />
      </Page>
    </Document>
  );
}

function localDateStamp(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function exportFilename(payload, date = new Date()) {
  return `arper-${payload.calculator}-${localDateStamp(date)}.pdf`;
}

export async function renderPdfBlob(payload) {
  registerFonts(window.location.origin);
  return pdf(<ExportDocument payload={payload} assetBase={window.location.origin} />).toBlob();
}

export async function downloadPdf(payload) {
  const blob = await renderPdfBlob(payload);
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = exportFilename(payload);
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give mobile browsers time to hand the blob off before it's released.
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}
