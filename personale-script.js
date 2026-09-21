const TYPE_COLORS = {
  "nbc": "#DC2626", "istituzionale": "#0066cc", "coppie-base": "#4F46E5",
  "seniores": "#D97706", "femminile": "#FF69B4", "gara-libera": "#059669"
};

const GITHUB_CONFIG = {
  owner: "fisbb-toscana",
  repo: "calendario-gare",
  branch: "main",
  filePath: "percorsi.json"
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
	updateGitHubButton();
  const savedUserId = sessionStorage.getItem("personal_user_id");
  const savedUser = users.find(u => String(u.id) === savedUserId && u.attivo !== false);
  if (savedUser) loginUser(savedUser); else openLogin();
}

function populateLoginUsers() {
  const select = document.getElementById("loginUser");

  if (!select) {
    console.error(
      "Elemento non trovato: loginUser"
    );

    return;
  }

  select.innerHTML =
    '<option value="">Seleziona un utente</option>';

  users
    .filter(user => user.attivo !== false)
    .sort((userA, userB) =>
      displayName(userA).localeCompare(
        displayName(userB),
        "it"
      )
    )
    .forEach(user => {
      const option =
        document.createElement("option");

      option.value = user.id;
      option.textContent = displayName(user);

      select.appendChild(option);
    });
}

function bindEvents() {
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("changeUserBtn").addEventListener("click", () => { sessionStorage.removeItem("personal_user_id"); currentUser = null; openLogin(); });
	document
	  .getElementById("seasonSelector")
	  .addEventListener("change", event => {
		 currentSeason = event.target.value;

		 populateEventSelect();
		 renderAll();
	  });
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
	document
	  .getElementById("githubLogoutBtn")
	  .addEventListener(
		 "click",
		 logoutGitHub
	  );

	document
	  .getElementById("showGithubToken")
	  .addEventListener("change", event => {
		 document.getElementById(
			"githubToken"
		 ).type = event.target.checked
			? "text"
			: "password";
	  });  
	  
  ["detailDialog", "editDialog", "githubDialog"].forEach(id => {
    document.getElementById(id).addEventListener("click", e => { if (e.target.id === id) e.target.close(); });
  });
}

function loginUser(user) {
  currentUser = user;

  sessionStorage.setItem(
    "personal_user_id",
    String(user.id)
  );

  renderUserCard();
  populateSeasons();
  populateEventSelect();
  renderAll();

  const githubToken =
    localStorage.getItem(
      "personal_github_token"
    );

  if (!githubToken && !offlineMode) {
    setTimeout(() => {
      openGitHubSettings();
    }, 300);
  }
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
  const seasons = [
    ...new Set(
      events
        .map(event => getEventSeason(event))
        .filter(Boolean)
    )
  ].sort().reverse();

  const currentRealSeason =
    getSeasonFromDate(new Date());

  if (
    currentRealSeason &&
    !seasons.includes(currentRealSeason)
  ) {
    seasons.push(currentRealSeason);
    seasons.sort().reverse();
  }

  const select =
    document.getElementById("seasonSelector");

  select.innerHTML = "";

  if (seasons.length === 0) {
    const option =
      document.createElement("option");

    option.value = "";
    option.textContent =
      "Nessuna stagione disponibile";

    select.appendChild(option);
    currentSeason = "";
    return;
  }

  seasons.forEach(season => {
    const option =
      document.createElement("option");

    option.value = season;
    option.textContent = season;

    select.appendChild(option);
  });

  if (
    currentSeason &&
    seasons.includes(currentSeason)
  ) {
    select.value = currentSeason;
  } else if (
    currentRealSeason &&
    seasons.includes(currentRealSeason)
  ) {
    currentSeason = currentRealSeason;
    select.value = currentRealSeason;
  } else {
    currentSeason = seasons[0];
    select.value = currentSeason;
  }
}

function getSeasonFromDate(value) {
  if (!value) {
    return null;
  }

  let year;
  let month;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    year = value.getFullYear();
    month = value.getMonth();
  } else {
    const parts = String(value).trim().split("-");

    if (parts.length !== 3) {
      return null;
    }

    year = Number(parts[0]);
    month = Number(parts[1]) - 1;

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 0 ||
      month > 11
    ) {
      return null;
    }
  }

  if (month >= 8) {
    return `${year}-${year + 1}`;
  }

  return `${year - 1}-${year}`;
}

function getEventSeason(event) {
  if (!event) {
    return null;
  }

  const referenceDate =
    event.end_date ||
    event.start;

  return getSeasonFromDate(referenceDate);
}

function populateEventSelect(
  selectedEventId = ""
) {
  const select =
    document.getElementById("editEvent");

  select.innerHTML =
    '<option value="">Seleziona una gara</option>';

  const seasonEvents = events
    .filter(event =>
      getEventSeason(event) === currentSeason
    )
    .sort((a, b) => {
      const dateA =
        a.end_date ||
        a.start ||
        "";

      const dateB =
        b.end_date ||
        b.start ||
        "";

      return dateA.localeCompare(dateB);
    });

  seasonEvents.forEach(event => {
		if (event.id === undefined || event.id === null) {
		  console.warn(
			 "Gara senza ID:",
			 event.title
		  );

		  return;
		}
    const option =
      document.createElement("option");

    option.value = event.id;
    option.textContent =
      `${formatDate(
        event.end_date || event.start
      )} - ${event.title}`;

    select.appendChild(option);
  });

  if (selectedEventId) {
    select.value = String(selectedEventId);
  }
}

function selectedPaths() {
  return paths.filter(path => {
    if (
      String(path.utente_id) !==
      String(currentUser?.id)
    ) {
      return false;
    }

    const linkedEvent =
      events.find(event =>
        String(event.id) ===
        String(path.gara_id)
      );

    if (linkedEvent) {
      return (
        getEventSeason(linkedEvent) ===
        currentSeason
      );
    }

    /*
      Compatibilità con eventuali percorsi
      vecchi o gare non più presenti.
    */
    return path.stagione === currentSeason;
  });
}

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
  currentPathId = id; 
  const path = id ? paths.find(p => String(p.id) === String(id)) : null;
  if (path) {
  const linkedEvent =
    events.find(event =>
      String(event.id) ===
      String(path.gara_id)
    );

  const pathSeason =
    linkedEvent
      ? getEventSeason(linkedEvent)
      : path.stagione;

  if (pathSeason) {
    currentSeason = pathSeason;

    document.getElementById(
      "seasonSelector"
    ).value = pathSeason;
  }
}

populateEventSelect(
  path?.gara_id || ""
);
  document.getElementById("editDialogTitle").textContent = path ? "Modifica partecipazione" : "Nuova partecipazione";
  document.getElementById("editId").value = path?.id || ""; 
  document.getElementById("editEvent").value = path?.gara_id || ""; document.getElementById("editDate").value = path?.data_giocata || new Date().toISOString().slice(0,10); document.getElementById("editResult").value = path?.risultato || ""; document.getElementById("editEntry").value = path?.iscrizione ?? 0; document.getElementById("editPrize").value = path?.premio ?? 0; document.getElementById("editRanking").value = path?.ranking ?? 0; document.getElementById("editBattery").value = String(path?.batteria_superata ?? false); document.getElementById("editNotes").value = path?.note || "";
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

	const selectedEventId =
	  document.getElementById(
		 "editEvent"
	  ).value;

	const selectedEvent =
	  events.find(event =>
		 String(event.id) ===
		 String(selectedEventId)
	  );

	const participationSeason =
	  selectedEvent
		 ? getEventSeason(selectedEvent)
		 : currentSeason; 

 const matches = [...document.querySelectorAll(".match-editor-row")].map((row, i) => ({ id: Date.now()+i, ordine: i+1, fase: row.querySelector(".match-phase-input").value.trim(), avversario: row.querySelector(".match-opponent-input").value.trim(), categoria: row.querySelector(".match-category-input").value, esito: row.querySelector(".match-result-input").value })).filter(m => m.avversario);

  const path = { 
		id, 
		utente_id: currentUser.id, 
		gara_id: selectedEventId, 
		stagione: participationSeason, 
		data_giocata: document.getElementById("editDate").value, 
		iscrizione: number(document.getElementById("editEntry").value), 
		premio: number(document.getElementById("editPrize").value), 
		risultato: document.getElementById("editResult").value.trim(), 
		ranking: number(document.getElementById("editRanking").value), 
		batteria_superata: document.getElementById("editBattery").value === "true", 
		note: document.getElementById("editNotes").value.trim(), 
		incontri: matches 
	};
	
  const index = paths.findIndex(p => String(p.id) === String(id)); if (index >= 0) paths[index] = path; else paths.push(path);
  closeEdit(); populateSeasons(); renderAll(); await trySync();
}

async function deleteCurrentPath() {
  if (!confirm("Eliminare definitivamente questa partecipazione?")) return;
  paths = paths.filter(p => String(p.id) !== String(currentPathId)); document.getElementById("detailDialog").close(); populateSeasons(); renderAll(); await trySync();
}

function openGitHubSettings() {
  const token =
    localStorage.getItem(
      "personal_github_token"
    ) || "";

  const tokenInput =
    document.getElementById(
      "githubToken"
    );

  const logoutButton =
    document.getElementById(
      "githubLogoutBtn"
    );

  const statusMessage =
    document.getElementById(
      "githubStatusMessage"
    );

  tokenInput.value = token;
  tokenInput.type = "password";

  document.getElementById(
    "showGithubToken"
  ).checked = false;

  if (token) {
    statusMessage.textContent =
      "GitHub configurato. Le modifiche saranno salvate direttamente nel repository.";

    statusMessage.className =
      "github-status-message connected";

    statusMessage.hidden = false;
    logoutButton.hidden = false;
  } else {
    statusMessage.textContent =
      "GitHub non è ancora configurato.";

    statusMessage.className =
      "github-status-message disconnected";

    statusMessage.hidden = false;
    logoutButton.hidden = true;
  }

  document
    .getElementById("githubDialog")
    .showModal();
}

function saveGitHubSettings(event) {
  event.preventDefault();

  const token =
    document
      .getElementById("githubToken")
      .value
      .trim();

  if (!token) {
    alert(
      "Inserisci un token GitHub valido."
    );

    return;
  }

  localStorage.setItem(
    "personal_github_token",
    token
  );

  document
    .getElementById("githubDialog")
    .close();

  updateGitHubButton();

  alert(
    "Token GitHub salvato nel browser. " +
    "Le modifiche saranno sincronizzate " +
    "direttamente con percorsi.json."
  );
}
function logoutGitHub() {
  const confirmed = confirm(
    "Vuoi rimuovere il token GitHub " +
    "memorizzato in questo browser?"
  );

  if (!confirmed) {
    return;
  }

  localStorage.removeItem(
    "personal_github_token"
  );

  document.getElementById(
    "githubToken"
  ).value = "";

  document
    .getElementById("githubDialog")
    .close();

  updateGitHubButton();

  alert(
    "Token GitHub rimosso dal browser."
  );
}

function updateGitHubButton() {
  const button =
    document.getElementById(
      "githubSettingsBtn"
    );

  const token =
    localStorage.getItem(
      "personal_github_token"
    );

  if (token) {
    button.textContent =
      "● GitHub connesso";

    button.classList.add(
      "github-connected"
    );

    button.title =
      "GitHub configurato. Clicca per " +
      "modificare o rimuovere il token.";
  } else {
    button.textContent =
      "Configura GitHub";

    button.classList.remove(
      "github-connected"
    );

    button.title =
      "Inserisci il token GitHub";
  }
}

async function trySync() {
  const token =
    localStorage.getItem(
      "personal_github_token"
    );

  if (offlineMode) {
    alert(
      "Modifica applicata ai dati dimostrativi. " +
      "In modalità offline non è possibile " +
      "aggiornare GitHub."
    );

    return;
  }

  if (!token) {
    alert(
      "La modifica è visibile nella sessione " +
      "corrente, ma GitHub non è configurato. " +
      "Inserisci il token per pubblicarla."
    );

    openGitHubSettings();
    return;
  }

  try {
    await pushJsonToGitHub(
      GITHUB_CONFIG.filePath,
      paths,
      "Aggiornamento percorsi personali"
    );

    alert(
      "Partecipazione salvata correttamente " +
      "su GitHub."
    );
  } catch (error) {
    console.error(
      "Errore sincronizzazione GitHub:",
      error
    );

    alert(
      "La modifica è stata applicata nella " +
      "pagina, ma la sincronizzazione GitHub " +
      "è fallita.\n\n" +
      error.message
    );
  }
}

async function pushJsonToGitHub(
  filePath,
  data,
  message
) {
  const token =
    localStorage.getItem(
      "personal_github_token"
    );

  if (!token) {
    throw new Error(
      "Token GitHub non disponibile."
    );
  }

  const owner =
    GITHUB_CONFIG.owner;

  const repo =
    GITHUB_CONFIG.repo;

  const branch =
    GITHUB_CONFIG.branch;

  const url =
    `https://api.github.com/repos/` +
    `${encodeURIComponent(owner)}/` +
    `${encodeURIComponent(repo)}/` +
    `contents/${filePath}`;

  const headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "Content-Type": "application/json"
  };

  /*
    Recupero sempre lo SHA più recente,
    immediatamente prima del salvataggio.
  */
  const getResponse = await fetch(
    `${url}?ref=${encodeURIComponent(branch)}`,
    {
      method: "GET",
      headers
    }
  );

  if (!getResponse.ok) {
    const errorText =
      await getResponse.text();

    throw new Error(
      `Errore nel recupero di ${filePath}: ` +
      `${getResponse.status} ${errorText}`
    );
  }

  const currentFile =
    await getResponse.json();

  const jsonString =
    JSON.stringify(data, null, 2);

  const utf8Bytes =
    new TextEncoder().encode(jsonString);

  let binaryString = "";

  for (
    let index = 0;
    index < utf8Bytes.length;
    index++
  ) {
    binaryString += String.fromCharCode(
      utf8Bytes[index]
    );
  }

  const base64Content =
    btoa(binaryString);

  const putBody = {
    message,
    content: base64Content,
    sha: currentFile.sha,
    branch
  };

  const putResponse = await fetch(
    url,
    {
      method: "PUT",
      headers,
      body: JSON.stringify(putBody)
    }
  );

  if (!putResponse.ok) {
    const errorText =
      await putResponse.text();

    throw new Error(
      `Errore durante la scrittura di ` +
      `${filePath}: ` +
      `${putResponse.status} ${errorText}`
    );
  }

  return await putResponse.json();
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
