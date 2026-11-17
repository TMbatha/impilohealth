import { api } from '../shared/api.js';
import { esc, fmtDate, resultDetailHtml, resultSummaryHtml, statusBadge, messagesCardHtml, NOT_YET } from '../shared/render.js';

const app = document.getElementById('app');
const title = document.getElementById('title');
const back = document.getElementById('back');
const FOOT = '<p class="foot-note">Reviewed and released by your clinician. Not a substitute for a consultation.</p>';

const byNewest = (a, b) => b.collectionDate.localeCompare(a.collectionDate);
const link = (r) => `#/results/${encodeURIComponent(r.id)}`;

async function home() {
  title.textContent = 'FX Health';
  const [res, messages] = await Promise.all([api.memberResults(), api.memberMessages().catch(() => [])]);
  const results = (res || []).sort(byNewest);
  const latest = results[0];
  const name = (latest?.memberName || '').replace(/\s*\(demo\)/, '').split(' ')[0];
  app.innerHTML = `
    <section class="card">
      
      <h2>${name ? esc(name) : "Your results"}</h2>
      <p class="muted">Results appear once your clinician has reviewed them.</p>
    </section>
    ${latest ? `
      <section class="card">
        <h3>Latest result · ${fmtDate(latest.collectionDate)}</h3>
        ${latest.pathways.map((p) => `<p>${esc(p.name)}: ${statusBadge(p.status)}</p>`).join('')}
        <a class="btn btn-primary" style="width:100%" href="${link(latest)}">Open result</a>
      </section>
      ${latest.guidance ? `<section class="card guidance"><h3>From ${esc(latest.releasedBy)}</h3><p>${esc(latest.guidance)}</p></section>` : ''}`
    : NOT_YET}
    ${messagesCardHtml(messages)}
    ${FOOT}`;
}

// Incoming SMS: poll the member's messages and drop a notification banner when a new one lands.
const toast = document.createElement('div');
toast.className = 'sms-toast';
toast.setAttribute('role', 'status');
toast.setAttribute('aria-live', 'polite');
document.body.appendChild(toast);
let seenSms = null;
async function checkSms() {
  try {
    const msgs = (await api.memberMessages()) || [];
    const ids = msgs.map((m) => m.id);
    if (seenSms && ids.some((id) => !seenSms.includes(id))) {
      const m = msgs[0];
      toast.innerHTML = `<strong><span aria-hidden="true">✉</span> New SMS · FX Health</strong>${esc(m.body)}`;
      toast.onclick = () => { toast.classList.remove('show'); location.hash = `#/results/${encodeURIComponent(m.resultSetId)}`; };
      toast.classList.add('show');
      if (navigator.vibrate) navigator.vibrate(200);
      setTimeout(() => toast.classList.remove('show'), 8000);
      route();
    }
    seenSms = ids;
  } catch { /* offline: try again next tick */ }
}
checkSms();
setInterval(checkSms, 4000);

async function list() {
  title.textContent = 'My results';
  const results = ((await api.memberResults()) || []).sort(byNewest);
  app.innerHTML = (results.length ? results.map((r) => resultSummaryHtml(r, link(r))).join('') : NOT_YET) + FOOT;
}

async function detail(id) {
  title.textContent = 'Result';
  const dto = await api.memberResult(id);
  app.innerHTML = dto ? resultDetailHtml(dto, { audience: 'member' }) : NOT_YET;
}

function help() {
  title.textContent = 'Help';
  app.innerHTML = `<section class="card help"><h3>Reading your results</h3><dl>
    <dt>✓ Within range</dt><dd>In the usual range.</dd>
    <dt>◐ Borderline</dt><dd>Slightly outside the usual range.</dd>
    <dt>▲ Out of range</dt><dd>Your clinician will discuss next steps.</dd>
    <dt>⚠ Urgent</dt><dd>Your clinic will contact you directly.</dd>
    <dt>Band bar</dt><dd>The dark marker is your value across the full range.</dd>
    <dt>Trend</dt><dd>Compared with your last test. Tiny changes show as “unchanged”.</dd>
  </dl></section>${FOOT}`;
}

async function route() {
  const hash = location.hash || '#/';
  const parts = hash.slice(2).split('/').filter(Boolean).map(decodeURIComponent);
  const tab = parts[0] === 'results' ? 'results' : parts[0] === 'help' ? 'help' : 'home';
  document.querySelectorAll('.m-tabs a').forEach((a) => (a.dataset.tab === tab ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  back.hidden = !(parts[0] === 'results' && parts[1]);
  app.innerHTML = '<p class="muted">Loading…</p>';
  try {
    if (parts[0] === 'results') await (parts[1] ? detail(parts[1]) : list());
    else if (parts[0] === 'help') help();
    else await home();
  } catch (e) {
    app.innerHTML = `<div class="card"><p class="error">You appear to be offline or the service is unavailable.</p><p class="muted">${esc(e.message)}</p></div>`;
  }
  window.scrollTo(0, 0);
}

back.addEventListener('click', () => { location.hash = '#/results'; });
document.getElementById('refresh').addEventListener('click', route);
window.addEventListener('hashchange', route);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') route(); });
route();

// Installable PWA
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
let deferred;
const installBtn = document.getElementById('install');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; installBtn.style.display = 'inline-flex'; });
installBtn.addEventListener('click', async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; installBtn.style.display = 'none'; });
