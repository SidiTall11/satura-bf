const casesBody = document.querySelector('#cases-body');
const caseDetail = document.querySelector('#case-detail');
const errorBox = document.querySelector('#dashboard-error');
const statuses = ['À examiner', 'Orientation à préparer', 'En cours', 'Clôturé'];
let caseList = [];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function statusClass(status) {
  if (status.startsWith('À examiner')) return 'status-review';
  if (status.startsWith('Orientation')) return 'status-orient';
  if (status === 'En cours') return 'status-active';
  return 'status-closed';
}

function updateStats() {
  document.querySelector('#stat-total').textContent = caseList.length;
  document.querySelector('#stat-review').textContent = caseList.filter((item) => item.status === 'À examiner').length;
  document.querySelector('#stat-orient').textContent = caseList.filter((item) => ['Orientation à préparer', 'En cours'].includes(item.status)).length;
  document.querySelector('#stat-priority').textContent = caseList.filter((item) => item.priority.startsWith('Élevée')).length;
}

function renderCases() {
  casesBody.innerHTML = caseList.map((item) => `<tr data-case-id="${escapeHtml(item.id)}" tabindex="0" aria-label="Ouvrir le dossier ${escapeHtml(item.id)}" class="${item.id === selectedId ? 'selected' : ''}">
    <td><strong>${escapeHtml(item.id)}</strong><small>${escapeHtml(formatDate(item.createdAt))}</small></td>
    <td>${escapeHtml(item.area)}</td><td>${escapeHtml(item.category)}</td><td><span class="priority-label">${escapeHtml(item.priority)}</span></td>
    <td><span class="status-badge ${statusClass(item.status)}"><i></i>${escapeHtml(item.status)}</span></td>
  </tr>`).join('');
  casesBody.querySelectorAll('tr[data-case-id]').forEach((row) => {
    row.addEventListener('click', () => selectCase(row.dataset.caseId));
    row.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectCase(row.dataset.caseId); } });
  });
  updateStats();
  if (selectedId && caseList.some((item) => item.id === selectedId)) renderDetail(caseList.find((item) => item.id === selectedId));
  else if (caseList.length) selectCase(caseList[0].id);
}

let selectedId = null;
let events = null;
let eventRetries = 0;

// EventSource se reconnecte seul après une coupure, mais s'arrête définitivement
// si le serveur refuse la connexion (veille d'un hébergeur, redémarrage).
function startEvents() {
  if (events || !('EventSource' in window) || eventRetries >= 5) return;
  events = new EventSource('/api/events');
  events.addEventListener('case-created', loadCases);
  events.addEventListener('case-updated', loadCases);
  events.addEventListener('error', () => {
    if (events.readyState !== EventSource.CLOSED) return;
    events.close();
    events = null;
    eventRetries += 1;
    setTimeout(startEvents, 5000);
  });
}
function selectCase(id) {
  selectedId = id;
  casesBody.querySelectorAll('tr[data-case-id]').forEach((row) => row.classList.toggle('selected', row.dataset.caseId === id));
  renderDetail(caseList.find((item) => item.id === id));
}

function renderDetail(item) {
  if (!item) return;
  caseDetail.innerHTML = `<div class="selected-case"><span class="case-avatar">◎</span><div><h3>${escapeHtml(item.id)}</h3><p>Reçu le ${escapeHtml(formatDate(item.createdAt))}</p></div></div>
    <div class="detail-fields"><div><span>Zone</span><strong>${escapeHtml(item.area)}</strong></div><div><span>Besoin exprimé</span><strong>${escapeHtml(item.category)}</strong></div><div><span>Priorité</span><strong>${escapeHtml(item.priority)}</strong></div><div><span>Relais envisagé</span><strong>${escapeHtml(item.service)}</strong></div><div><span>Rappel</span><strong>${escapeHtml(item.callback)}</strong></div><div><span>Consentement / partage</span><strong>${escapeHtml(item.consent)}</strong></div></div>
    <label class="status-control">Avancement du dossier<select id="case-status">${statuses.map((status) => `<option value="${escapeHtml(status)}" ${status === item.status ? 'selected' : ''}>${escapeHtml(status)}</option>`).join('')}</select></label>
    <p class="detail-disclaimer">La priorité se confirme avec la personne et l’équipe d’accompagnement.</p>`;
  document.querySelector('#case-status').addEventListener('change', (event) => updateStatus(item.id, event.target.value));
}

async function loadCases() {
  errorBox.hidden = true;
  try {
    const response = await fetch('/api/cases', { cache: 'no-store' });
    if (!response.ok) throw new Error(response.status === 401 ? 'Connexion requise. Relancez le serveur local et utilisez le mot de passe affiché dans son terminal.' : 'Impossible de charger les dossiers.');
    const result = await response.json();
    if (!result.demo) throw new Error('Impossible de charger les dossiers.');
    caseList = result.cases;
    renderCases();
    startEvents();
  } catch (error) {
    errorBox.textContent = `${error.message} Vérifiez la connexion au serveur Sutura.`;
    errorBox.hidden = false;
    casesBody.innerHTML = '<tr><td colspan="5" class="loading">Chargement impossible.</td></tr>';
  }
}

async function updateStatus(id, status) {
  try {
    const response = await fetch(`/api/cases/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
    const result = await response.json();
    if (!response.ok || !result.demo) throw new Error(result.error || 'Mise à jour impossible.');
    caseList = caseList.map((item) => item.id === id ? result.case : item);
    renderCases();
  } catch (error) {
    errorBox.textContent = `${error.message} Aucune structure n’a été contactée.`;
    errorBox.hidden = false;
    loadCases();
  }
}

const intakeForm = document.querySelector('#intake-form');
const intakeStatus = document.querySelector('#intake-status');

intakeForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = intakeForm.querySelector('button[type="submit"]');
  const values = new FormData(intakeForm);
  button.disabled = true;
  intakeStatus.textContent = 'Création du dossier…';
  try {
    const response = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ category: values.get('category'), area: values.get('area') })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Création impossible.');
    intakeStatus.textContent = `Dossier ${result.case.id} ouvert · visible sur les postes connectés.`;
    intakeForm.reset();
    loadCases();
  } catch (error) {
    intakeStatus.textContent = `${error.message} Aucune structure extérieure n’a été contactée.`;
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#refresh-button').addEventListener('click', loadCases);
loadCases();
