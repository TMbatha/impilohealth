import { api } from '/shared/api.js';
import { esc, fmtDate, resultDetailHtml, resultSummaryHtml, statusBadge, NOT_YET } from '/shared/render.js';

const CLINICIAN = 'Dr A. Naidoo';
const app = document.getElementById('app');
const nav = document.getElementById('nav');

const MEMBER_NAV = [['#/', 'Dashboard'], ['#/results', 'My results'], ['#/help', 'Understanding results']];
const CLINICIAN_NAV = [['#/clinician', 'Review queue']];

const roleOf = (hash) => (hash.startsWith('#/clinician') ? 'clinician' : 'member');

function renderChrome(hash) {
  const role = roleOf(hash);
  document.querySelectorAll('.role button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.role === role)));
  const items = role === 'clinician' ? CLINICIAN_NAV : MEMBER_NAV;
  nav.innerHTML = items.map(([href, label]) => {
    const current = hash === href || (href !== '#/' && hash.startsWith(href));
    return `<a href="${href}" ${current ? 'aria-current="page"' : ''}>${label}</a>`;
  }).join('');
}

document.querySelectorAll('.role button').forEach((b) => b.addEventListener('click', () => {
  location.hash = b.dataset.role === 'clinician' ? '#/clinician' : '#/';
}));

const loading = () => { app.innerHTML = '<p class="muted">Loading…</p>'; };
const failed = (e) => { app.innerHTML = `<div class="card"><p class="error">Could not load: ${esc(e.message)}</p><button class="btn btn-ghost" onclick="location.reload()">Try again</button></div>`; };

// ---------- Member pages ----------

async function memberDashboard() {
  const results = (await api.memberResults()) || [];
  const sorted = [...results].sort((a, b) => b.collectionDate.localeCompare(a.collectionDate));
  const latest = sorted[0];
  const name = (latest?.memberName || 'there').replace(/\s*\(demo\)/, '').split(' ')[0];

  app.innerHTML = `
    <div class="hero">
      <section class="card welcome">
        <p class="eyebrow">Preventive health membership</p>
        <h2>Hello, ${esc(name)}</h2>
        <p class="muted">Every result is reviewed by your clinician before it appears here.</p>
        ${latest ? `<a class="btn btn-primary" href="#/results/${esc(latest.id)}">View latest result</a>` : ''}
      </section>
      <section class="card">
        <h3>At a glance</h3>
        ${latest ? latest.pathways.map((p) => `<p>${esc(p.name)}: ${statusBadge(p.status)}</p>`).join('')
          + `<p class="muted">From your test on ${fmtDate(latest.collectionDate)}</p>`
          : '<p class="muted">Nothing to show yet.</p>'}
      </section>
    </div>
    ${latest?.guidance ? `<section class="card guidance"><h3>Latest guidance from ${esc(latest.releasedBy)}</h3><p>${esc(latest.guidance)}</p></section>` : ''}
    <h2 class="section-title">Your results</h2>
    ${sorted.length ? sorted.map((r) => resultSummaryHtml(r, `#/results/${encodeURIComponent(r.id)}`)).join('') : NOT_YET}
    <p class="foot-note">Reviewed and released by your clinician. Not a substitute for a consultation.</p>`;
}

async function memberResultsList() {
  const results = ((await api.memberResults()) || []).sort((a, b) => b.collectionDate.localeCompare(a.collectionDate));
  app.innerHTML = `<div class="narrow"><h2>My results</h2><p class="muted">Released results, newest first.</p>
    ${results.length ? results.map((r) => resultSummaryHtml(r, `#/results/${encodeURIComponent(r.id)}`)).join('') : NOT_YET}</div>`;
}

async function memberResult(id) {
  const dto = await api.memberResult(id);
  app.innerHTML = `<div class="narrow"><a class="back" href="#/results">‹ All results</a>${dto ? resultDetailHtml(dto, { audience: 'member' }) : NOT_YET}</div>`;
}

function helpPage() {
  app.innerHTML = `<div class="narrow"><h2>Understanding your results</h2>
    <section class="card help"><dl>
      <dt>✓ Within range</dt><dd>Your value is in the usual range for this test.</dd>
      <dt>◐ Borderline</dt><dd>Slightly outside the usual range. Usually managed with lifestyle changes and a re-test.</dd>
      <dt>▲ Out of range</dt><dd>Clearly outside the usual range. Your clinician will discuss next steps.</dd>
      <dt>⚠ Urgent</dt><dd>Your clinic will contact you directly. You do not need to wait for this page.</dd>
      <dt>The band bar</dt><dd>Shows the full range for the test; the dark marker is your value.</dd>
      <dt>Trend</dt><dd>Compared with your previous test. Very small changes are shown as “unchanged”, because tests naturally vary a little.</dd>
      <dt>LDL not calculable</dt><dd>When triglycerides are high, the standard LDL calculation is not reliable, so we do not show a number.</dd>
    </dl></section>
    <p class="foot-note">Reviewed and released by your clinician. Not a substitute for a consultation.</p></div>`;
}

// ---------- Clinician pages ----------

async function reviewQueue() {
  const queue = ((await api.queue()) || []).sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.collectionDate.localeCompare(b.collectionDate));
  app.innerHTML = `<div class="narrow"><h2>Review queue</h2><p class="muted">${queue.length} result set${queue.length === 1 ? '' : 's'} awaiting review. Urgent first.</p>
    ${queue.length ? queue.map((q) => `<a class="card queue-item" href="#/clinician/${encodeURIComponent(q.id)}">
        <span><strong>${esc(q.memberName)}</strong><br><span class="muted">Collected ${fmtDate(q.collectionDate)}</span></span>
        <span>${q.urgent ? statusBadge('urgent') : '<span class="badge tone-ok">Routine</span>'} <span aria-hidden="true">›</span></span>
      </a>`).join('') : '<div class="card empty"><p class="empty-icon" aria-hidden="true">✓</p><h3>Queue clear</h3><p>Nothing awaiting review.</p></div>'}</div>`;
}

async function reviewConsole(id) {
  const dto = await api.staffDetail(id);
  if (!dto) { app.innerHTML = '<div class="card empty"><h3>Result set not found</h3><a href="#/clinician">Back to queue</a></div>'; return; }
  const released = dto.state === 'released';
  app.innerHTML = `<a class="back" href="#/clinician">‹ Review queue</a>
    <div class="console">
      <div>${resultDetailHtml(dto, { audience: 'clinician' })}</div>
      <aside class="card console-side">
        <h3>Guidance for member</h3>
        <label class="muted" for="guidance">Edit before releasing. The member sees this text exactly.</label>
        <textarea id="guidance" ${released ? 'readonly' : ''}>${esc(dto.guidance)}</textarea>
        <div id="release-area" style="margin-top:12px">
          ${released
            ? `<p class="confirm">✓ Released by ${esc(dto.releasedBy)} on ${fmtDate(dto.releasedAt)}</p>`
            : `<button id="release" class="btn btn-primary" type="button">Release to member</button>
               <p class="muted" style="margin-top:8px">Releasing as ${CLINICIAN}</p>`}
        </div>
      </aside>
    </div>`;

  const btn = document.getElementById('release');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const body = document.getElementById('guidance').value.trim();
    if (!body) { alert('Guidance cannot be empty.'); return; }
    btn.disabled = true; btn.textContent = 'Releasing…';
    try {
      await api.release(id, body, CLINICIAN);
      document.getElementById('guidance').readOnly = true;
      document.getElementById('release-area').innerHTML =
        `<p class="confirm" role="status">✓ Released to ${esc(dto.memberName)} by ${CLINICIAN}. It is now visible in their web and mobile app.</p>
         <a class="btn btn-ghost" href="#/clinician">Back to queue</a>`;
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Release to member';
      document.getElementById('release-area').insertAdjacentHTML('beforeend', `<p class="error">${esc(e.message)}</p>`);
    }
  });
}

// ---------- Router ----------

async function route() {
  const hash = location.hash || '#/';
  renderChrome(hash);
  loading();
  const parts = hash.slice(2).split('/').filter(Boolean).map(decodeURIComponent);
  try {
    if (parts[0] === 'clinician') await (parts[1] ? reviewConsole(parts[1]) : reviewQueue());
    else if (parts[0] === 'results') await (parts[1] ? memberResult(parts[1]) : memberResultsList());
    else if (parts[0] === 'help') helpPage();
    else await memberDashboard();
  } catch (e) { failed(e); }
  app.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
