const TYPE_COLORS = {
  "nbc": "#DC2626", "istituzionale": "#0066cc", "coppie-base": "#4F46E5",
  "seniores": "#D97706", "femminile": "#FF69B4", "gara-libera": "#059669"
};

const demoUsers = [
  { id: "emanuele", nome: "Emanuele", cognome: "Terzuoli", nome_visualizzato: "Emanuele Terzuoli", pin: "1234", categoria: "Master", csb: "CSB Dimostrativo", attivo: true },
  { id: "utente-demo", nome: "Utente", cognome: "Demo", nome_visualizzato: "Utente Dimostrativo", pin: "5678", categoria: "Prima", csb: "CSB Demo", attivo: true }
];
const demoEvents = [
  { id: "demo-marameo", title: "1° TROFEO NETWIN NEWS - 25° ANNIVERSARIO MARAMEO", className: "gara-libera", sede: "MARAMEO A.S.D. (PT)", start: "2025-09-25", end_date: "2025-10-05", specialita: "Tutti Doppi a 1000 punti" },
  { id: "demo-biliardo", title: "1° TROFEO IL BILIARDO", className: "gara-libera", sede: "IL BILIARDO (PI)", start: "2025-10-13", end_date: "2025-11-01", specialita: "Tutti Doppi a 800 punti" }
];
const demoPaths = [
  { id: "emanuele-marameo", utente_id: "emanuele", gara_id: "demo-marameo", stagione: "2025-2026", data_giocata: "2025-09-30", iscrizione: 35, premio: 0, risultato: "Eliminato ai 32esimi", ranking: 9, batteria_superata: true, note: "", incontri: [
    { id: 1, ordine: 1, fase: "1° turno", avversario: "Quintavalle", categoria: "Prima", esito: "V" },
    { id: 2, ordine: 2, fase: "2° turno", avversario: "Berretta", categoria: "Master", esito: "V" },
    { id: 3, ordine: 3, fase: "3° turno", avversario: "Barbini", categoria: "Nazionale", esito: "V" },
    { id: 4, ordine: 4, fase: "32esimi", avversario: "Caratozzolo", categoria: "Nazionale Pro", esito: "P" }
  ]},
  { id: "emanuele-biliardo", utente_id: "emanuele", gara_id: "demo-biliardo", stagione: "2025-2026", data_giocata: "2025-10-21", iscrizione: 30, premio: 136, risultato: "Eliminato ai quarti", ranking: 10, batteria_superata: true, note: "Buon percorso complessivo.", incontri: [
    { id: 1, ordine: 1, fase: "1° turno", avversario: "Malasoma", categoria: "Prima", esito: "V" },
    { id: 2, ordine: 2, fase: "2° turno", avversario: "Ferri", categoria: "Prima", esito: "V" },
    { id: 3, ordine: 3, fase: "3° turno", avversario: "Galassi", categoria: "Prima", esito: "V" },
    { id: 4, ordine: 4, fase: "Quarti", avversario: "Martinelli", categoria: "Master", esito: "P" }
  ]}
];

let users = [], events = [], paths = [];
let currentUser = null, currentSeason = "", currentPathId = null;
let offlineMode = false;

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

async function loadData() {
  let fallback = false;
  try { users = await loadJson("utenti.json"); } catch (e) { console.warn(e); users = structuredClone(demoUsers); fallback = true; }
  try { paths = await loadJson("percorsi.json"); } catch (e) { console.warn(e); paths = structuredClone(demoPaths); fallback = true; }
  try { events = await loadJson("gare.json"); } catch (e) { console.warn(e); events = structuredClone(demoEvents); fallback = true; }
  offlineMode = fallback;
  document.getElementById("offlineNotice").hidden = !offlineMode;
  initializeApp();
}

function initializeApp() {
  populateLoginUsers();
  bindEvents();
  const savedUserId = sessionStorage.getItem("personal_user_id");
  const savedUser = users.find(u => String(u.id) === savedUserId && u.attivo !== false);
  if (savedUser) loginUser(savedUser); else openLogin();
}

function bindEvents() {
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("changeUserBtn").addEventListener("click", () => { sessionStorage.removeItem("personal_user_id"); currentUser = null; openLogin(); });
  document.getElementById("seasonSelector").addEventListener("change", e => { currentSeason = e.target.value; renderAll(); });
  document.getElementById("searchInput").addEventListener("input", renderList);
  document.getElementById("newParticipationBtn").addEventListener("click", () => openEdit());
  document.getElementById("detailClose").addEventListener("click", () => document.getElementById("detailDialog").close());
  document.getElementById("editParticipationBtn").addEventListener("click", () => { document.getElementById("detailDialog").close(); openEdit(currentPathId); });
  document.getElementById("deleteParticipationBtn").addEventListener("click", deleteCurrentPath);
  document.getElementById("editClose").addEventListener("click", closeEdit);
  document.getElementById("editCancel").addEventListener("click", closeEdit);
  document.getElementById("editForm").addEventListener("submit", saveEdit);
  document.getElementById("addMatchBtn").addEventListener("click", () => addMatchEditorRow());
  document.getElementById("menuToggle").addEventListener("click", () => toggleMenu(true));
  document.getElementById("menuClose").addEventListener("click", () => toggleMenu(false));
  document.getElementById("sidebarOverlay").addEventListener("click", () => toggleMenu(false));
  document.getElementById("githubSettingsBtn").addEventListener("click", openGitHubSettings);
  document.getElementById("githubClose").addEventListener("click", () => document.getElementById("githubDialog").close());
  document.getElementById("githubForm").addEventListener("submit", saveGitHubSettings);
  ["detailDialog", "editDialog", "githubDialog"].forEach(id => {
    document.getElementById(id).addEventListener("click", e => { if (e.target.id === id) e.target.close(); });
  });
}

function populateLoginUsers() {
  const select = document.getElementById("loginUser");
  select.innerHTML = '<option value="">Seleziona un utente</option>';
  users.filter(u => u.attivo !== false).sort((a,b) => displayName(a).localeCompare(displayName(b))).forEach(user => {
    const option = document.createElement("option"); option.value = user.id; option.textContent = displayName(user); select.appendChild(option);
  });
}
function displayName(user) { return user.nome_visualizzato || `${user.nome || ""} ${user.cognome || ""}`.trim() || user.id; }
function openLogin() { document.getElementById("loginPin").value = ""; document.getElementById("loginError").hidden = true; document.getElementById("loginDialog").showModal(); }
function handleLogin(e) {
  e.preventDefault();
  const user = users.find(u => String(u.id) === document.getElementById("loginUser").value);
  const pin = document.getElementById("loginPin").value;
  if (!user || String(user.pin) !== pin) { const err = document.getElementById("loginError"); err.textContent = "Utente o PIN non corretto."; err.hidden = false; return; }
  loginUser(user); document.getElementById("loginDialog").close();
}
function loginUser(user) {
  currentUser = user; sessionStorage.setItem("personal_user_id", String(user.id));
  renderUserCard(); populateSeasons(); populateEventSelect(); renderAll();
}
function renderUserCard() {
  const name = displayName(currentUser);
  document.getElementById("userDisplayName").textContent = name;
  document.getElementById("userCategory").textContent = currentUser.categoria || "Categoria non indicata";
  document.getElementById("userCsb").textContent = currentUser.csb || "CSB non indicato";
  document.getElementById("userInitials").textContent = name.split(/\s+/).slice(0,2).map(x => x[0]).join("").toUpperCase();
  document.getElementById("userCard").hidden = false;
  document.getElementById("pageTitle").textContent = `Il percorso di ${currentUser.nome || name}`;
}
function populateSeasons() {
  const own = paths.filter(p => String(p.utente_id) === String(currentUser.id));
  const seasons = [...new Set(own.map(p => p.stagione).filter(Boolean))].sort().reverse();
  if (!seasons.length) seasons.push(getSeasonFromDate(new Date()));
  const select = document.getElementById("seasonSelector"); select.innerHTML = "";
  seasons.forEach(s => { const o = document.createElement("option"); o.value = s; o.textContent = s; select.appendChild(o); });
  currentSeason = seasons.includes(currentSeason) ? currentSeason : seasons[0]; select.value = currentSeason;
}
function getSeasonFromDate(date) { const y = date.getFullYear(), m = date.getMonth(); return m >= 8 ? `${y}-${y+1}` : `${y-1}-${y}`; }
function populateEventSelect() {
  const select = document.getElementById("editEvent"); select.innerHTML = '<option value="">Seleziona una gara</option>';
  [...events].sort((a,b) => String(b.end_date || b.start || "").localeCompare(String(a.end_date || a.start || ""))).forEach(evt => {
    const o = document.createElement("option"); o.value = evt.id; o.textContent = evt.title; select.appendChild(o);
  });
}
function selectedPaths() { return paths.filter(p => String(p.utente_id) === String(currentUser?.id) && p.stagione === currentSeason); }
function eventFor(path) { return events.find(e => String(e.id) === String(path.gara_id)) || { title: path.titolo_gara || "Gara non presente nel calendario", className: path.className || "gara-libera", sede: path.sede || "" }; }
function renderAll() { if (!currentUser) return; renderSummary(); renderList(); }
function renderSummary() {
  const list = selectedPaths(); const matches = list.flatMap(p => p.incontri || []);
  const wins = matches.filter(m => String(m.esito).toUpperCase() === "V").length; const losses = matches.filter(m => String(m.esito).toUpperCase() === "P").length;
  const ranking = list.reduce((s,p) => s + number(p.ranking), 0); const entries = list.reduce((s,p) => s + number(p.iscrizione), 0); const prizes = list.reduce((s,p) => s + number(p.premio), 0); const balance = prizes - entries;
  document.getElementById("summaryTournaments").textContent = list.length;
  document.getElementById("summaryMatches").textContent = matches.length;
  document.getElementById("summaryMatchesDetail").textContent = `${wins} vinte · ${losses} perse`;
  document.getElementById("summaryRanking").textContent = signed(ranking);
  const balanceEl = document.getElementById("summaryBalance"); balanceEl.textContent = euro(balance); balanceEl.className = balance > 0 ? "rank-positive" : balance < 0 ? "rank-negative" : "rank-zero";
  document.getElementById("summaryBalanceDetail").textContent = `${euro(prizes)} premi · ${euro(entries)} iscrizioni`;
}
function renderList() {
  const term = document.getElementById("searchInput").value.trim().toLowerCase();
  const list = selectedPaths().filter(p => eventFor(p).title.toLowerCase().includes(term)).sort((a,b) => String(b.data_giocata).localeCompare(String(a.data_giocata)));
  const body = document.getElementById("participationsBody"), mobile = document.getElementById("mobileList"); body.innerHTML = ""; mobile.innerHTML = "";
  document.getElementById("visibleCount").textContent = `${list.length} ${list.length === 1 ? "gara visualizzata" : "gare visualizzate"}`;
  if (!list.length) { body.innerHTML = '<tr><td colspan="5" class="empty-row">Nessuna partecipazione trovata</td></tr>'; mobile.innerHTML = '<p class="empty-row">Nessuna partecipazione trovata</p>'; return; }
  list.forEach(path => {
    const evt = eventFor(path), color = TYPE_COLORS[evt.className] || "#64748b", rankClass = number(path.ranking) > 0 ? "rank-positive" : number(path.ranking) < 0 ? "rank-negative" : "rank-zero";
    const tr = document.createElement("tr"); tr.innerHTML = `<td>${formatDate(path.data_giocata)}</td><td><span class="type-badge" style="background:${color}">${typeLabel(evt.className)}</span></td><td class="event-title">${escapeHtml(evt.title)}</td><td>${escapeHtml(path.risultato || "-")}</td><td class="numeric ${rankClass}">${signed(number(path.ranking))}</td>`; tr.addEventListener("click", () => openDetail(path.id)); body.appendChild(tr);
    const card = document.createElement("article"); card.className = "mobile-card"; card.innerHTML = `<div class="mobile-card-top"><span class="type-badge" style="background:${color}">${typeLabel(evt.className)}</span><strong class="mobile-card-rank ${rankClass}">${signed(number(path.ranking))}</strong></div><h4>${escapeHtml(evt.title)}</h4><p>${formatDate(path.data_giocata)} · ${escapeHtml(path.risultato || "-")}</p>`; card.addEventListener("click", () => openDetail(path.id)); mobile.appendChild(card);
  });
}
function openDetail(id) {
  const path = paths.find(p => String(p.id) === String(id)); if (!path) return; currentPathId = path.id; const evt = eventFor(path), color = TYPE_COLORS[evt.className] || "#64748b";
  const badge = document.getElementById("detailType"); badge.textContent = typeLabel(evt.className); badge.style.background = color;
  document.getElementById("detailTitle").textContent = evt.title; document.getElementById("detailVenue").textContent = evt.sede || "Sede non indicata";
  document.getElementById("detailDate").textContent = formatDate(path.data_giocata); document.getElementById("detailResult").textContent = path.risultato || "-";
  document.getElementById("detailEntry").textContent = euro(path.iscrizione); document.getElementById("detailPrize").textContent = euro(path.premio); document.getElementById("detailRanking").textContent = signed(number(path.ranking)); document.getElementById("detailBattery").textContent = path.batteria_superata ? "Superata" : "Non superata";
  const matches = [...(path.incontri || [])].sort((a,b) => number(a.ordine)-number(b.ordine)); document.getElementById("detailMatchCount").textContent = `${matches.length} ${matches.length === 1 ? "incontro" : "incontri"}`;
  const box = document.getElementById("detailMatches"); box.innerHTML = ""; matches.forEach(m => { const row = document.createElement("div"); const win = String(m.esito).toUpperCase() === "V"; row.className = "match-row"; row.innerHTML = `<span class="match-phase">${escapeHtml(m.fase || "-")}</span><strong class="match-opponent">${escapeHtml(m.avversario || "-")}</strong><span class="match-category">${escapeHtml(m.categoria || "-")}</span><span class="match-result ${win ? "win" : "loss"}">${win ? "V" : "P"}</span>`; box.appendChild(row); });
  const noteSection = document.getElementById("detailNotesSection"); noteSection.hidden = !path.note?.trim(); document.getElementById("detailNotes").textContent = path.note || "";
  document.getElementById("detailDialog").showModal();
}
function openEdit(id = null) {
  currentPathId = id; const path = id ? paths.find(p => String(p.id) === String(id)) : null;
  document.getElementById("editDialogTitle").textContent = path ? "Modifica partecipazione" : "Nuova partecipazione";
  document.getElementById("editId").value = path?.id || ""; document.getElementById("editEvent").value = path?.gara_id || ""; document.getElementById("editDate").value = path?.data_giocata || new Date().toISOString().slice(0,10); document.getElementById("editResult").value = path?.risultato || ""; document.getElementById("editEntry").value = path?.iscrizione ?? 0; document.getElementById("editPrize").value = path?.premio ?? 0; document.getElementById("editRanking").value = path?.ranking ?? 0; document.getElementById("editBattery").value = String(path?.batteria_superata ?? false); document.getElementById("editNotes").value = path?.note || "";
  const editor = document.getElementById("matchesEditor"); editor.innerHTML = ""; (path?.incontri || []).sort((a,b) => number(a.ordine)-number(b.ordine)).forEach(addMatchEditorRow); if (!path?.incontri?.length) addMatchEditorRow(); document.getElementById("editDialog").showModal();
}
function closeEdit() { document.getElementById("editDialog").close(); }
function addMatchEditorRow(match = {}) {
  const container = document.getElementById("matchesEditor"), row = document.createElement("div"); row.className = "match-editor-row";
  row.innerHTML = `<label>Fase<input class="form-control match-phase-input" value="${escapeAttr(match.fase || "")}" placeholder="1° turno"></label><label>Avversario<input class="form-control match-opponent-input" value="${escapeAttr(match.avversario || "")}"></label><label>Categoria<select class="form-control match-category-input">${["Terza","Seconda","Prima","Master","Nazionale","Nazionale Pro","Coppia"].map(c => `<option ${match.categoria===c?"selected":""}>${c}</option>`).join("")}</select></label><label>Esito<select class="form-control match-result-input"><option value="V" ${match.esito==="V"?"selected":""}>Vinta</option><option value="P" ${match.esito==="P"?"selected":""}>Persa</option></select></label><button class="remove-match" type="button" title="Elimina incontro">✕</button>`;
  row.querySelector(".remove-match").addEventListener("click", () => row.remove()); container.appendChild(row);
}
async function saveEdit(e) {
  e.preventDefault(); const id = document.getElementById("editId").value || `path-${Date.now()}`;
  const matches = [...document.querySelectorAll(".match-editor-row")].map((row, i) => ({ id: Date.now()+i, ordine: i+1, fase: row.querySelector(".match-phase-input").value.trim(), avversario: row.querySelector(".match-opponent-input").value.trim(), categoria: row.querySelector(".match-category-input").value, esito: row.querySelector(".match-result-input").value })).filter(m => m.avversario);
  const path = { id, utente_id: currentUser.id, gara_id: document.getElementById("editEvent").value, stagione: currentSeason || getSeasonFromDate(new Date(document.getElementById("editDate").value)), data_giocata: document.getElementById("editDate").value, iscrizione: number(document.getElementById("editEntry").value), premio: number(document.getElementById("editPrize").value), risultato: document.getElementById("editResult").value.trim(), ranking: number(document.getElementById("editRanking").value), batteria_superata: document.getElementById("editBattery").value === "true", note: document.getElementById("editNotes").value.trim(), incontri: matches };
  const index = paths.findIndex(p => String(p.id) === String(id)); if (index >= 0) paths[index] = path; else paths.push(path);
  closeEdit(); populateSeasons(); renderAll(); await trySync();
}
async function deleteCurrentPath() {
  if (!confirm("Eliminare definitivamente questa partecipazione?")) return;
  paths = paths.filter(p => String(p.id) !== String(currentPathId)); document.getElementById("detailDialog").close(); populateSeasons(); renderAll(); await trySync();
}
function openGitHubSettings() {
  document.getElementById("githubOwner").value = sessionStorage.getItem("gh_owner") || "fisbb-toscana"; document.getElementById("githubRepo").value = sessionStorage.getItem("gh_repo") || "calendario-gare"; document.getElementById("githubBranch").value = sessionStorage.getItem("gh_branch") || "main"; document.getElementById("githubToken").value = sessionStorage.getItem("gh_token") || ""; document.getElementById("githubDialog").showModal();
}
function saveGitHubSettings(e) { e.preventDefault(); ["Owner","Repo","Branch","Token"].forEach(k => sessionStorage.setItem(`gh_${k.toLowerCase()}`, document.getElementById(`github${k}`).value.trim())); document.getElementById("githubDialog").close(); alert("Configurazione GitHub salvata per questa sessione."); }
async function trySync() {
  const token = sessionStorage.getItem("gh_token"); if (!token || offlineMode) { alert("Modifica salvata nella sessione corrente. Configura GitHub per pubblicarla online."); return; }
  try { await pushJsonToGitHub("percorsi.json", paths, "Aggiornamento percorsi personali"); alert("Dati sincronizzati con GitHub."); } catch (e) { console.error(e); alert(`Salvataggio locale riuscito, sincronizzazione GitHub fallita: ${e.message}`); }
}
async function pushJsonToGitHub(filePath, data, message) {
  const owner = sessionStorage.getItem("gh_owner"), repo = sessionStorage.getItem("gh_repo"), branch = sessionStorage.getItem("gh_branch") || "main", token = sessionStorage.getItem("gh_token");
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filePath}`;
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };
  const get = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers }); if (!get.ok) throw new Error(`lettura SHA: ${get.status}`); const current = await get.json();
  const json = JSON.stringify(data, null, 2); const bytes = new TextEncoder().encode(json); let binary = ""; bytes.forEach(b => binary += String.fromCharCode(b));
  const put = await fetch(url, { method: "PUT", headers, body: JSON.stringify({ message, content: btoa(binary), sha: current.sha, branch }) }); if (!put.ok) throw new Error(`scrittura: ${put.status} ${await put.text()}`);
}
function toggleMenu(open) { document.getElementById("sidebar").classList.toggle("open", open); document.getElementById("sidebarOverlay").classList.toggle("open", open); document.getElementById("menuToggle").setAttribute("aria-expanded", String(open)); document.body.style.overflow = open ? "hidden" : ""; }
function number(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function signed(v) { return v > 0 ? `+${v}` : String(v); }
function euro(v) { return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(number(v)); }
function formatDate(v) { if (!v) return "-"; const [y,m,d] = v.split("-"); return y && m && d ? `${d}/${m}/${y}` : v; }
function typeLabel(value) { return value ? value.replaceAll("-", " ") : "torneo"; }
function escapeHtml(v) { const d = document.createElement("div"); d.textContent = v ?? ""; return d.innerHTML; }
function escapeAttr(v) { return String(v ?? "").replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }

loadData();
