// Shared result renderer: used unchanged by the member web app, clinician console and mobile app.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
};

const NAMES = {
  HBA1C: 'HbA1c', FPG: 'Fasting glucose', TC: 'Total cholesterol',
  LDL: 'LDL cholesterol', HDL: 'HDL cholesterol', TG: 'Triglycerides',
};

// Display scale per analyte: [scaleMin, scaleMax] and band segments (to = upper cut, tone = ok|warn|bad).
const SCALES = {
  HBA1C: { min: 4, max: 8, segs: [{ to: 5.7, tone: 'ok' }, { to: 6.5, tone: 'warn' }, { to: 8, tone: 'bad' }] },
  FPG: { min: 3, max: 9, segs: [{ to: 6.1, tone: 'ok' }, { to: 7.0, tone: 'warn' }, { to: 9, tone: 'bad' }] },
  TC: { min: 2.5, max: 8, segs: [{ to: 4.5, tone: 'ok' }, { to: 8, tone: 'warn' }] },
  LDL: { min: 1, max: 6, segs: [{ to: 3.0, tone: 'ok' }, { to: 6, tone: 'warn' }] },
  HDL: { min: 0.5, max: 2.2, segs: [{ to: 0.9, tone: 'bad' }, { to: 1.2, tone: 'warn' }, { to: 1.3, tone: 'warn' }, { to: 1.5, tone: 'ok' }, { to: 2.2, tone: 'ok' }] },
  TG: { min: 0.5, max: 5, segs: [{ to: 1.7, tone: 'ok' }, { to: 5, tone: 'warn' }] },
};

export const STATUS = {
  within_range: { icon: '✓', word: 'Within range', tone: 'ok' },
  borderline: { icon: '◐', word: 'Borderline', tone: 'warn' },
  out_of_range: { icon: '▲', word: 'Out of range', tone: 'bad' },
  urgent: { icon: '⚠', word: 'Urgent', tone: 'bad' },
};

export const statusBadge = (status) => {
  const s = STATUS[status] || { icon: '?', word: status, tone: 'warn' };
  return `<span class="badge tone-${s.tone}"><span aria-hidden="true">${s.icon}</span> ${esc(s.word)}</span>`;
};

const toneOfBand = (band = '') => {
  if (/CRITICAL|DIABETES_RANGE|VERY_LOW/.test(band)) return 'bad';
  if (/INTERMEDIATE|IFG|ABOVE_TARGET|_LOW$|BORDERLINE|RAISED/.test(band)) return 'warn';
  return 'ok';
};
const TONE_ICON = { ok: '✓', warn: '◐', bad: '▲' };

function bandBar(a) {
  const sc = SCALES[a.code];
  if (!sc || typeof a.value !== 'number') return '';
  const pct = (v) => ((Math.min(Math.max(v, sc.min), sc.max) - sc.min) / (sc.max - sc.min)) * 100;
  let from = sc.min;
  const segs = sc.segs.map((s) => {
    const html = `<span class="seg tone-${s.tone}" style="left:${pct(from)}%;width:${pct(s.to) - pct(from)}%"></span>`;
    from = s.to;
    return html;
  }).join('');
  const range = [a.low, a.high].every((x) => x === null) ? '' :
    a.low === null ? `usual band below ${a.high}` : a.high === null ? `band from ${a.low}` : `band ${a.low}–${a.high}`;
  return `<div class="bandbar" role="img" aria-label="${esc(NAMES[a.code] || a.code)} ${a.value} ${esc(a.unit)}, ${esc(a.label)}, ${range}">
      ${segs}<span class="marker" style="left:${pct(a.value)}%"></span>
    </div>
    <div class="bandbar-scale" aria-hidden="true"><span>${sc.min}</span><span>${esc(range)}</span><span>${sc.max}</span></div>`;
}

const sign = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);

export function trendText(t) {
  if (!t) return '';
  if (t.direction === 'first') return '<span class="trend">• first test</span>';
  const arrow = t.delta > 0 ? '↑' : t.delta < 0 ? '↓' : '→';
  const pct = t.pctDelta === null ? '' : ` (${sign(t.pctDelta)}%)`;
  return `<span class="trend trend-${t.direction}"><span aria-hidden="true">${arrow}</span> ${esc(t.direction)}, ${sign(t.delta)}${pct}</span>`;
}

function analyteRow(a, derived) {
  const name = NAMES[a.code] || a.code;
  if (a.code === 'LDL' && (derived?.ldlCalculable === false || a.value === null)) {
    return `<li class="analyte">
      <div class="analyte-head"><span class="analyte-name">${esc(name)}</span></div>
      <p class="not-calculable"><span aria-hidden="true">ⓘ</span> LDL not calculable at this triglyceride level</p>
    </li>`;
  }
  const tone = toneOfBand(a.band);
  return `<li class="analyte">
    <div class="analyte-head">
      <span class="analyte-name">${esc(name)}</span>
      <span class="analyte-value">${esc(a.value)} <small>${esc(a.unit)}</small></span>
    </div>
    <div class="analyte-meta">
      <span class="badge tone-${tone}"><span aria-hidden="true">${TONE_ICON[tone]}</span> ${esc(a.label)}</span>
      ${a.flagged ? '<span class="badge tone-bad"><span aria-hidden="true">⚑</span> Unusual value, check with lab</span>' : ''}
      ${a.critical ? '<span class="badge tone-bad"><span aria-hidden="true">⚠</span> Critical value</span>' : ''}
      ${trendText(a.trend)}
    </div>
    ${bandBar(a)}
  </li>`;
}

const BMI_WORDS = { BMI_UNDER: 'Underweight', BMI_NORMAL: 'Healthy range', BMI_OVERWEIGHT: 'Overweight', BMI_OBESE: 'Obese range' };
const BP_WORDS = {
  BP_NORMAL: 'Normal', BP_OPTIMAL: 'Optimal', BP_HIGH_NORMAL: 'High-normal',
  BP_GRADE_1: 'Grade 1 (raised)', BP_GRADE_2: 'Grade 2 (raised)', BP_GRADE_3: 'Grade 3 (high)',
};

function derivedBlock(dto) {
  const d = dto.derived || {};
  const bp = dto.bloodPressure;
  const cell = (label, value, note = '') => `<div class="stat"><span class="stat-label">${label}</span><span class="stat-value">${value ?? '–'}</span>${note ? `<span class="stat-note">${note}</span>` : ''}</div>`;
  return `<section class="card">
    <h3>Body measures and ratios</h3>
    <div class="stats">
      ${bp ? cell('Blood pressure', `${bp.systolic}/${bp.diastolic} <small>mmHg</small>`, esc(BP_WORDS[bp.band] || bp.band)) : ''}
      ${cell('BMI', d.bmi, esc(BMI_WORDS[d.bmiBand] || ''))}
      ${cell('Non-HDL cholesterol', d.nonHdl === null ? null : `${d.nonHdl} <small>mmol/L</small>`)}
      ${cell('TC : HDL ratio', d.tcHdlRatio)}
    </div>
  </section>`;
}

/** Full result view. audience: 'member' | 'clinician'. */
export function resultDetailHtml(dto, { audience = 'member' } = {}) {
  const pathways = (dto.pathways || []).map((p) => `<section class="card">
      <div class="pathway-head"><h3>${esc(p.name)}</h3>${statusBadge(p.status)}</div>
      <ul class="analytes">${p.analytes.map((a) => analyteRow(a, dto.derived)).join('')}</ul>
    </section>`).join('');

  const guidance = audience === 'member' && dto.guidance
    ? `<section class="card guidance"><h3>Your clinician's guidance</h3><p>${esc(dto.guidance).replace(/\n/g, '<br>')}</p>
       <p class="muted">Released by ${esc(dto.releasedBy)} on ${fmtDate(dto.releasedAt)}</p></section>`
    : '';

  const footer = audience === 'member'
    ? '<p class="foot-note">Reviewed and released by your clinician. Not a substitute for a consultation.</p>'
    : '';

  return `<header class="result-head">
      <p class="eyebrow">Blood test · ${fmtDate(dto.collectionDate)}</p>
      <h2>${audience === 'clinician' ? esc(dto.memberName) : 'Your results'}</h2>
      ${dto.urgent ? `<p>${statusBadge('urgent')}</p>` : ''}
    </header>
    ${guidance}${pathways}${derivedBlock(dto)}${footer}`;
}

/** Compact card for lists. */
export function resultSummaryHtml(dto, href) {
  const statuses = (dto.pathways || []).map((p) => `<span class="summary-pathway">${esc(p.name)} ${statusBadge(p.status)}</span>`).join('');
  return `<a class="card result-card" href="${href}">
    <span class="result-card-date">${fmtDate(dto.collectionDate)}</span>
    <span class="result-card-paths">${statuses}</span>
    <span class="result-card-go" aria-hidden="true">›</span>
  </a>`;
}

/** An SMS shown as a phone message bubble. */
export function smsBubbleHtml(sms) {
  if (!sms) return '';
  const when = new Date(sms.sentAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  return `<div class="sms">
    <p class="sms-meta"><span aria-hidden="true">✉</span> SMS to ${esc(sms.toMasked)} · ${when}</p>
    <p class="sms-body">${esc(sms.body)}</p>
    <p class="sms-meta">${esc(sms.status)} · ${sms.body.length} chars</p>
  </div>`;
}

export function messagesCardHtml(messages) {
  return `<section class="card"><h3>Messages</h3>
    ${messages && messages.length ? messages.map(smsBubbleHtml).join('')
      : '<p class="muted">We will SMS you when new results have been reviewed. Your results themselves are never sent by SMS.</p>'}
  </section>`;
}

export const NOT_YET = '<div class="card empty"><p class="empty-icon" aria-hidden="true">⏳</p><h3>Not available yet</h3><p>Your results appear here once your clinician has reviewed them.</p></div>';
