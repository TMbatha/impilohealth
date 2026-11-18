import { api, STATIC_MODE } from './shared/api.js';
import { esc, fmtDate, resultDetailHtml, resultSummaryHtml, statusBadge, smsBubbleHtml, messagesCardHtml, NOT_YET } from './shared/render.js';

const CLINICIAN = 'Dr A. Naidoo';
const app = document.getElementById('app');
const nav = document.getElementById('nav');

const MEMBER_NAV = [['#/', 'Dashboard'], ['#/results', 'My results'], ['#/help', 'Understanding results']];
const CLINICIAN_NAV = [['#/clinician', 'Review queue'], ['#/clinician/all', 'All results'], ['#/clinician/new', 'New result'], ['#/clinician/members', 'Members']];

const roleOf = (hash) => (hash.startsWith('#/clinician') ? 'clinician' : 'member');

function renderChrome(hash) {
  const role = roleOf(hash);
  document.querySelectorAll('.role button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.role === role)));
  const items = role === 'clinician' ? CLINICIAN_NAV : MEMBER_NAV;
  nav.innerHTML = items.map(([href, label]) => {
    const current = hash === href || (href !== '#/' && href !== '#/clinician' && hash.startsWith(href))
      || (href === '#/clinician' && /^#\/clinician\/rs/.test(hash));
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
  const [results, messages] = await Promise.all([api.memberResults(), api.memberMessages().catch(() => [])]);
  const sorted = [...(results || [])].sort((a, b) => b.collectionDate.localeCompare(a.collectionDate));
  const latest = sorted[0];
  const name = (latest?.memberName || 'there').replace(/\s*\(demo\)/, '').split(' ')[0];

  app.innerHTML = `
    <div class="hero">
      <section class="card welcome">
        <p class="eyebrow">Impilo member · Moderate risk plan</p>
        <h2>${esc(name)}, your health record</h2>
        <p class="muted">Every result is reviewed by your clinician before it appears here.</p>
        ${latest ? `<a class="btn btn-primary" href="#/results/${esc(latest.id)}">View latest result</a>` : ''}
      </section>
      <section class="card">
        <h3>Latest summary</h3>
        ${latest ? latest.pathways.map((p) => `<p>${esc(p.name)}: ${statusBadge(p.status)}</p>`).join('')
          + `<p class="muted">From your test on ${fmtDate(latest.collectionDate)}</p>`
          : '<p class="muted">Nothing to show yet.</p>'}
      </section>
    </div>
    ${latest?.guidance ? `<section class="card guidance"><h3>Latest guidance from ${esc(latest.releasedBy)}</h3><p>${esc(latest.guidance)}</p></section>` : ''}
    ${messagesCardHtml(messages)}
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
  const history = dto.history || [];
  const deletable = !released && !history.some((h) => h.action === 'released' || h.action === 'withdrawn');
  app.innerHTML = `<a class="back" href="#/clinician">‹ Review queue</a>
    <div class="console">
      <div>${resultDetailHtml(dto, { audience: 'clinician' })}${historyHtml(history)}</div>
      <aside class="card console-side">
        <h3>Guidance for member</h3>
        <label class="muted" for="guidance">Edit before releasing. The member sees this text exactly.</label>
        <textarea id="guidance" ${released ? 'readonly' : ''}>${esc(dto.guidance)}</textarea>
        <div id="release-area" style="margin-top:12px">
          ${released
            ? `<p class="confirm">✓ Released by ${esc(dto.releasedBy)} on ${fmtDate(dto.releasedAt)}</p>
               <button id="withdraw" class="btn btn-ghost" type="button">Withdraw release…</button>
               <p class="muted" style="margin-top:8px">Hides this result from the member again. The record is kept.</p>`
            : `<div class="row-actions">
                 <button id="release" class="btn btn-primary" type="button">Release to member</button>
                 <button id="save-draft" class="btn btn-ghost" type="button">Save draft</button>
               </div>
               <p class="muted" style="margin-top:8px">Releasing as ${CLINICIAN}</p>
               <div class="row-actions" style="margin-top:12px">
                 <a class="btn btn-ghost" href="#/clinician/${encodeURIComponent(id)}/edit">Edit lab values</a>
                 ${deletable ? '<button id="delete" class="btn btn-danger" type="button">Delete entry</button>' : ''}
               </div>`}
          <p id="console-msg" role="status" aria-live="polite"></p>
        </div>
      </aside>
    </div>`;

  const msg = (text, ok = true) => { const el = document.getElementById('console-msg'); el.className = ok ? 'confirm-inline' : 'error'; el.textContent = text; };

  document.getElementById('save-draft')?.addEventListener('click', async () => {
    try { await api.saveDraft(id, document.getElementById('guidance').value); msg('✓ Draft saved'); } catch (e) { msg(e.message, false); }
  });
  document.getElementById('delete')?.addEventListener('click', async () => {
    if (!confirm('Delete this entry? Only possible because it was never released to the member.')) return;
    try { await api.deleteResultSet(id); location.hash = '#/clinician/all'; } catch (e) { msg(e.message, false); }
  });
  document.getElementById('withdraw')?.addEventListener('click', async () => {
    const reason = prompt('Reason for withdrawing (kept on record):', 'Lab reported a correction');
    if (reason === null) return;
    try { await api.withdraw(id, reason, CLINICIAN); route(); } catch (e) { msg(e.message, false); }
  });

  const btn = document.getElementById('release');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const body = document.getElementById('guidance').value.trim();
    if (!body) { alert('Guidance cannot be empty.'); return; }
    btn.disabled = true; btn.textContent = 'Releasing…';
    try {
      const out = await api.release(id, body, CLINICIAN);
      document.getElementById('guidance').readOnly = true;
      document.getElementById('release-area').innerHTML =
        `<p class="confirm" role="status">✓ Released to ${esc(dto.memberName)} by ${CLINICIAN}. It is now visible in their web and mobile app.</p>
         ${out?.sms ? `<p class="muted" style="margin:12px 0 0">Member notified by SMS:</p>${smsBubbleHtml(out.sms)}` : ''}
         <a class="btn btn-ghost" href="#/clinician">Back to queue</a>`;
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Release to member';
      document.getElementById('release-area').insertAdjacentHTML('beforeend', `<p class="error">${esc(e.message)}</p>`);
    }
  });
}

// ---------- Clinician CRUD pages ----------

const ACTION_WORDS = { created: 'Entered', corrected: 'Lab values corrected', draft_saved: 'Draft saved', released: 'Released', withdrawn: 'Withdrawn' };
function historyHtml(history) {
  if (!history.length) return '';
  return `<section class="card"><h3>Record history</h3><ul class="history">
    ${history.map((h) => `<li><strong>${esc(ACTION_WORDS[h.action] || h.action)}</strong>${h.by ? ` by ${esc(h.by)}` : ''}
      <span class="muted">· ${h.at ? new Date(h.at).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</span>
      ${h.note ? `<br><span class="muted">Reason: ${esc(h.note)}</span>` : ''}</li>`).join('')}
  </ul></section>`;
}

const STATE_BADGE = {
  awaiting_review: '<span class="badge tone-warn"><span aria-hidden="true">◐</span> Awaiting review</span>',
  released: '<span class="badge tone-ok"><span aria-hidden="true">✓</span> Released</span>',
};

async function allResults() {
  const rows = (await api.allResultSets()) || [];
  app.innerHTML = `<div class="page-head"><h2>All results</h2><a class="btn btn-primary" href="#/clinician/new">New result</a></div>
    <div class="card table-wrap"><table class="table">
      <thead><tr><th>Member</th><th>Collected</th><th>Status</th><th>Released by</th><th><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${rows.length ? rows.map((r) => `<tr>
        <td><strong>${esc(r.memberName)}</strong></td>
        <td>${fmtDate(r.collectionDate)}</td>
        <td>${STATE_BADGE[r.state] || esc(r.state)} ${r.urgent ? statusBadge('urgent') : ''}</td>
        <td>${r.releasedBy ? esc(r.releasedBy) : '<span class="muted">–</span>'}</td>
        <td class="actions">
          <a href="#/clinician/${encodeURIComponent(r.id)}">Open</a>
          ${r.state === 'awaiting_review' ? `<a href="#/clinician/${encodeURIComponent(r.id)}/edit">Edit</a>` : ''}
          ${r.deletable ? `<button class="link-danger" data-delete="${esc(r.id)}" type="button">Delete</button>` : ''}
        </td></tr>`).join('') : '<tr><td colspan="5" class="muted">No result sets.</td></tr>'}</tbody>
    </table></div>`;
  app.querySelectorAll('[data-delete]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Delete this never-released entry?')) return;
    try { await api.deleteResultSet(b.dataset.delete); route(); } catch (e) { alert(e.message); }
  }));
}

const FIELDS = [
  ['HBA1C', 'HbA1c', '%', '0.1'], ['FPG', 'Fasting glucose', 'mmol/L', '0.1'], ['TC', 'Total cholesterol', 'mmol/L', '0.1'],
  ['LDL', 'LDL cholesterol', 'mmol/L', '0.1'], ['HDL', 'HDL cholesterol', 'mmol/L', '0.01'], ['TG', 'Triglycerides', 'mmol/L', '0.1'],
];

async function resultForm(id) {
  const [members, existing] = await Promise.all([api.members(), id ? api.rawResultSet(id) : null]);
  if (id && !existing) { app.innerHTML = '<div class="card empty"><h3>Result set not found</h3></div>'; return; }
  if (existing && existing.state !== 'awaiting_review') {
    app.innerHTML = `<div class="card empty"><h3>Released results can't be edited</h3><p>Withdraw the release first, then correct the values.</p><a href="#/clinician/${encodeURIComponent(id)}">Back to result</a></div>`;
    return;
  }
  const v = existing?.values || {};
  const val = (x) => (x === null || x === undefined ? '' : esc(x));
  app.innerHTML = `<div class="narrow">
    <a class="back" href="${id ? `#/clinician/${encodeURIComponent(id)}` : '#/clinician/all'}">‹ Back</a>
    <h2>${id ? 'Correct lab values' : 'New result'}</h2>
    <p class="muted">Values are classified automatically against the reference ranges. The result goes to the review queue and is never visible to the member until released.</p>
    <form id="rs-form" class="card form" novalidate>
      <div class="grid-2">
        <label>Member
          <select name="memberId" required ${id ? 'disabled' : ''}>
            ${(members || []).map((m) => `<option value="${esc(m.id)}" ${existing?.memberId === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}
          </select>
          ${id ? '' : '<a class="small-link" href="#/clinician/members">+ Add a member</a>'}
        </label>
        <label>Collection date<input name="collectionDate" type="date" required value="${val(existing?.collectionDate) || new Date().toISOString().slice(0, 10)}"></label>
      </div>
      <fieldset><legend>Lab values</legend><div class="grid-3">
        ${FIELDS.map(([code, label, unit, step]) => `<label>${label} <small>${unit}</small><input name="${code}" type="number" inputmode="decimal" step="${step}" min="0" value="${val(v[code])}"></label>`).join('')}
      </div></fieldset>
      <fieldset><legend>Measurements</legend><div class="grid-3">
        <label>Height <small>m</small><input name="heightM" type="number" step="0.01" min="0" value="${val(existing?.heightM)}"></label>
        <label>Weight <small>kg</small><input name="weightKg" type="number" step="0.1" min="0" value="${val(existing?.weightKg)}"></label>
        <label>Blood pressure <small>mmHg</small><span class="bp"><input name="systolic" type="number" min="0" aria-label="Systolic" placeholder="Sys" value="${val(existing?.bloodPressure?.systolic)}"> / <input name="diastolic" type="number" min="0" aria-label="Diastolic" placeholder="Dia" value="${val(existing?.bloodPressure?.diastolic)}"></span></label>
      </div></fieldset>
      ${id ? '' : '<label>Guidance draft <small>optional</small><textarea name="guidance" rows="4"></textarea></label>'}
      <p id="form-error" class="error" role="alert"></p>
      <div class="row-actions">
        <button class="btn btn-primary" type="submit">${id ? 'Save corrections' : 'Create and open for review'}</button>
        <button id="fill-demo" class="btn btn-ghost" type="button">Fill example (TG 5.0)</button>
      </div>
    </form></div>`;

  const form = document.getElementById('rs-form');
  document.getElementById('fill-demo').addEventListener('click', () => {
    const ex = { HBA1C: 6.2, FPG: 6.6, TC: 6.4, LDL: 3.9, HDL: 0.95, TG: 5.0, heightM: 1.64, weightKg: 76, systolic: 146, diastolic: 88 };
    for (const [k, x] of Object.entries(ex)) form.elements[k].value = x;
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (id) data.memberId = existing.memberId;
    const err = document.getElementById('form-error');
    err.textContent = '';
    try {
      const saved = id ? await api.updateResultSet(id, data) : await api.createResultSet(data);
      location.hash = `#/clinician/${encodeURIComponent(saved.id)}`;
    } catch (ex) { err.textContent = ex.message; }
  });
}

async function membersPage() {
  const members = (await api.members()) || [];
  const RISK = ['LOW', 'MODERATE', 'HIGH'];
  const riskSelect = (sel) => `<select name="riskCategory">${RISK.map((r) => `<option ${r === sel ? 'selected' : ''}>${r}</option>`).join('')}</select>`;
  app.innerHTML = `<h2>Members</h2><p class="muted">Phone numbers are used only for the “results ready” SMS.</p>
    <div class="card table-wrap"><table class="table">
      <thead><tr><th>Name</th><th>Phone</th><th>Risk category</th><th>Results</th><th><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${members.map((m) => `<tr data-id="${esc(m.id)}">
        <td><input name="name" value="${esc(m.name)}" aria-label="Name"></td>
        <td><input name="phone" value="${esc(m.phone || '')}" aria-label="Phone" placeholder="+27…"></td>
        <td>${riskSelect(m.riskCategory)}</td>
        <td>${m.resultCount}</td>
        <td class="actions"><button class="btn btn-ghost btn-sm" data-save type="button">Save</button></td>
      </tr>`).join('')}</tbody>
    </table><p id="members-msg" role="status" aria-live="polite"></p></div>
    <form id="add-member" class="card form">
      <h3>Add a member</h3>
      <div class="grid-3">
        <label>Full name<input name="name" required></label>
        <label>Mobile number<input name="phone" placeholder="+27 82 123 4567"></label>
        <label>Risk category${riskSelect('MODERATE')}</label>
      </div>
      <p id="add-error" class="error" role="alert"></p>
      <button class="btn btn-primary" type="submit">Add member</button>
    </form>`;

  const say = (t, ok = true) => { const el = document.getElementById('members-msg'); el.className = ok ? 'confirm-inline' : 'error'; el.textContent = t; };
  app.querySelectorAll('[data-save]').forEach((b) => b.addEventListener('click', async () => {
    const row = b.closest('tr');
    const data = Object.fromEntries([...row.querySelectorAll('input, select')].map((el) => [el.name, el.value]));
    try { const m = await api.updateMember(row.dataset.id, data); say(`✓ Saved ${m.name}`); } catch (e) { say(e.message, false); }
  }));
  document.getElementById('add-member').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api.createMember(Object.fromEntries(new FormData(e.target).entries())); route(); }
    catch (ex) { document.getElementById('add-error').textContent = ex.message; }
  });
}

// ---------- Router ----------

async function route() {
  const hash = location.hash || '#/';
  renderChrome(hash);
  loading();
  const parts = hash.slice(2).split('/').filter(Boolean).map(decodeURIComponent);
  try {
    if (parts[0] === 'clinician') {
      if (!parts[1]) await reviewQueue();
      else if (parts[1] === 'all') await allResults();
      else if (parts[1] === 'new') await resultForm(null);
      else if (parts[1] === 'members') await membersPage();
      else if (parts[2] === 'edit') await resultForm(parts[1]);
      else await reviewConsole(parts[1]);
    }
    else if (parts[0] === 'results') await (parts[1] ? memberResult(parts[1]) : memberResultsList());
    else if (parts[0] === 'help') helpPage();
    else await memberDashboard();
  } catch (e) { failed(e); }
  app.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();

// GitHub Pages: no server, so data lives in this browser. Offer a reset for repeat demos.
if (STATIC_MODE) {
  document.querySelector('.logo').setAttribute('href', '../'); // back to the landing page
  const bar = document.createElement('footer');
  bar.className = 'demo-bar';
  bar.innerHTML = 'Demo mode: data is saved in this browser only. <button type="button">Reset demo data</button>';
  bar.querySelector('button').addEventListener('click', async () => {
    if (!confirm('Reset all demo data back to the starting state?')) return;
    await api.resetDemo();
    location.hash = '#/';
    route();
  });
  document.body.appendChild(bar);
}
