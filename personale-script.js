const TYPE_COLORS = {
  "nbc": "#DC2626", "istituzionale": "#0066cc", "coppie-base": "#4F46E5",
  "seniores": "#D97706", "femminile": "#FF69B4", "gara-libera": "#059669"
};

const GITHUB_CONFIG = {
  owner: "fisbb-toscana",
  repo: "calendario-gare",
  branch: "main",
  filePath: "percorsi.json",
  filePathPlayers: "giocatori.json",
  filePathClubs: "csb.json"
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
const demoClubs = [
  {
    id: "F19B36",
    codice_affiliazione: "F19B36",
    denominazione: "C.S.B. BILIARDI BASSA MAREA A.S.DILETTANTISTICA",
    regione: "Toscana",
    provenienza: "federale",
    attivo: true
  }
];

const demoPlayers = [
  {
    id: "FB51A412",
    codice_tessera: "FB51A412",
    nome: "Emanuele",
    cognome: "Terzuoli",
    nome_visualizzato: "Emanuele Terzuoli",
    categoria: "Master",
    csb_id: "F19B36",
    regione: "Toscana",
    provenienza: "federale",
    attivo: true
  }
];

let users = [];
let events = [];
let paths = [];
let players = [];
let clubs = [];
let currentUser = null, currentSeason = "", currentPathId = null;
let offlineMode = false;
let githubSaveInProgress = false;
let playersById = new Map();
let clubsById = new Map();
let currentMatchEditorRow = null;

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
	try {
	  players = await loadJson("giocatori.json");
	} catch (error) {
	  console.warn(
		 "Caricamento giocatori.json non riuscito:",
		 error
	  );

	  players = structuredClone(demoPlayers);
	  fallback = true;
	}

	try {
	  clubs = await loadJson("csb.json");
	} catch (error) {
	  console.warn(
		 "Caricamento csb.json non riuscito:",
		 error
	  );

	  clubs = structuredClone(demoClubs);
	  fallback = true;
	}
  
  offlineMode = fallback;
  document.getElementById("offlineNotice").hidden = !offlineMode;
	buildPlayerIndexes();
  initializeApp();
}

function buildPlayerIndexes() {
  playersById = new Map(
    players.map(player => [
      String(player.id),
      player
    ])
  );

  clubsById = new Map(
    clubs.map(club => [
      String(club.id),
      club
    ])
  );
}

function getCategoryBadge(category) {
  const normalizedCategory =
    String(category || "")
      .trim()
      .toLowerCase();

  const categoryMap = {
    "nazionale pro": {
      label: "NP",
      className: "category-np"
    },

    "nazionale": {
      label: "N",
      className: "category-n"
    },

    "master": {
      label: "M",
      className: "category-m"
    },

    "prima": {
      label: "1",
      className: "category-1"
    },

    "seconda": {
      label: "2",
      className: "category-2"
    },

    "terza": {
      label: "3",
      className: "category-3"
    },

    "junior": {
      label: "J",
      className: "category-other"
    },

    "senior": {
      label: "S",
      className: "category-other"
    },

    "coppia": {
      label: "C",
      className: "category-other"
    }
  };

  return categoryMap[normalizedCategory] || {
    label: "?",
    className: "category-other"
  };
}

function getClubById(clubId) {
  if (!clubId) {
    return null;
  }

  return clubsById.get(String(clubId)) || null;
}

function getClubName(clubId) {
  const club = getClubById(clubId);

  return club?.denominazione || "";
}

function getPlayerById(playerId) {
  if (!playerId) {
    return null;
  }

  return playersById.get(String(playerId)) || null;
}

function getPlayerDisplayName(player) {
  if (!player) {
    return "";
  }

  return (
    player.nome_visualizzato ||
    `${player.nome || ""} ${player.cognome || ""}`.trim() ||
    player.codice_tessera ||
    player.id
  );
}

function initializeApp() {
  populateLoginUsers();
  populatePlayersDataList();
  populateNewPlayerClubSelect();
  bindEvents();
	updateGitHubButton();
  const savedUserId = sessionStorage.getItem("personal_user_id");
  const savedUser = users.find(u => String(u.id) === savedUserId && u.attivo !== false);
  if (savedUser) loginUser(savedUser); else openLogin();
}

function openNewPlayerDialog() {
  const activeOpponentInput =
    document.activeElement?.classList?.contains(
      "match-opponent-input"
    )
      ? document.activeElement
      : null;

  if (activeOpponentInput) {
    currentMatchEditorRow =
      activeOpponentInput.closest(
        ".match-editor-row"
      );
  }

  const currentText =
    currentMatchEditorRow
      ? currentMatchEditorRow
          .querySelector(
            ".match-opponent-input"
          )
          .value
          .trim()
      : "";

  document.getElementById(
    "newPlayerForm"
  ).reset();

  document.getElementById(
    "newPlayerActive"
  ).checked = true;

  document.getElementById(
    "newPlayerRegion"
  ).value = "Toscana";

  document.getElementById(
    "newPlayerError"
  ).hidden = true;

  /*
    Se nel campo avversario è già stato scritto qualcosa,
    proviamo a usarlo come cognome iniziale.
  */
  if (currentText) {
    document.getElementById(
      "newPlayerLastName"
    ).value = currentText;
  }

  document
    .getElementById("newPlayerDialog")
    .showModal();

  window.setTimeout(() => {
    const firstNameInput =
      document.getElementById(
        "newPlayerFirstName"
      );

    const lastNameInput =
      document.getElementById(
        "newPlayerLastName"
      );

    if (currentText) {
      firstNameInput.focus();
    } else {
      lastNameInput.focus();
    }
  }, 50);
}

function closeNewPlayerDialog() {
  document
    .getElementById("newPlayerDialog")
    .close();
}

async function saveNewPlayer(event) {
  event.preventDefault();

  const firstName =
    document
      .getElementById("newPlayerFirstName")
      .value
      .trim();

  const lastName =
    document
      .getElementById("newPlayerLastName")
      .value
      .trim();

  const cardCode =
    document
      .getElementById("newPlayerCardCode")
      .value
      .trim()
      .toUpperCase();

  const category =
    document
      .getElementById("newPlayerCategory")
      .value;

  const clubId =
    document
      .getElementById("newPlayerClub")
      .value;

  const region =
    document
      .getElementById("newPlayerRegion")
      .value
      .trim();

  const active =
    document
      .getElementById("newPlayerActive")
      .checked;

  const errorElement =
    document.getElementById("newPlayerError");

  if (
    !firstName ||
    !lastName ||
    !cardCode ||
    !category
  ) {
    errorElement.textContent =
      "Compila nome, cognome, codice tessera e categoria.";

    errorElement.hidden = false;
    return;
  }

  const duplicateCard = players.find(player =>
    String(player.codice_tessera || player.id)
      .toUpperCase() === cardCode
  );

  if (duplicateCard) {
    errorElement.textContent =
      `Il codice tessera ${cardCode} è già associato a ` +
      `${getPlayerDisplayName(duplicateCard)}.`;

    errorElement.hidden = false;
    return;
  }

	const githubToken =
	  localStorage.getItem(
		 "personal_github_token"
	  );

	if (!githubToken) {
	  errorElement.textContent =
		 "Configura GitHub prima di aggiungere un nuovo Giocatore.";

	  errorElement.hidden = false;
	  return;
	}

  const newPlayer = {
    id: cardCode,
    codice_tessera: cardCode,
    nome: firstName,
    cognome: lastName,
    nome_visualizzato:
      `${firstName} ${lastName}`.trim(),
    categoria: category,
    csb_id: clubId || null,
    regione: region || "",
    provenienza: "manuale",
    attivo: active
  };

  players.push(newPlayer);

  players.sort((playerA, playerB) => {
    const surnameComparison =
      String(playerA.cognome || "")
        .localeCompare(
          String(playerB.cognome || ""),
          "it",
          { sensitivity: "base" }
        );

    if (surnameComparison !== 0) {
      return surnameComparison;
    }

    return String(playerA.nome || "")
      .localeCompare(
        String(playerB.nome || ""),
        "it",
        { sensitivity: "base" }
      );
  });

  buildPlayerIndexes();
  populatePlayersDataList();

  if (currentMatchEditorRow) {
    currentMatchEditorRow
      .querySelector(
        ".match-opponent-input"
      )
      .value =
        getPlayerDisplayName(newPlayer);

    currentMatchEditorRow
      .querySelector(
        ".match-player-id"
      )
      .value = newPlayer.id;

    currentMatchEditorRow
      .querySelector(
        ".match-club-id"
      )
      .value = newPlayer.csb_id || "";

    currentMatchEditorRow
      .querySelector(
        ".match-category-input"
      )
      .value = newPlayer.categoria;
  }

  closeNewPlayerDialog();

  try {
    await pushJsonToGitHub(
      GITHUB_CONFIG.filePathPlayers,
      players,
      `Aggiunta giocatore ${newPlayer.nome_visualizzato}`
    );

    alert(
      "Giocatore aggiunto e salvato su GitHub."
    );
  } catch (error) {
    console.error(
      "Errore salvataggio giocatore:",
      error
    );

    alert(
      "Il giocatore è disponibile nella sessione corrente, " +
      "ma il salvataggio su GitHub è fallito.\n\n" +
      error.message
    );
  }
}

function populateNewPlayerClubSelect(
  selectedClubId = ""
) {
  const select =
    document.getElementById("newPlayerClub");

  if (!select) {
    return;
  }

  select.innerHTML =
    '<option value="">Nessun CSB / da specificare</option>';

  clubs
    .filter(club => club.attivo !== false)
    .sort((clubA, clubB) =>
      String(clubA.denominazione || "")
        .localeCompare(
          String(clubB.denominazione || ""),
          "it",
          { sensitivity: "base" }
        )
    )
    .forEach(club => {
      const option =
        document.createElement("option");

      option.value = club.id;

      option.textContent =
        `${club.denominazione} (` +
        `${club.codice_affiliazione || club.id})`;

      select.appendChild(option);
    });

  if (
    selectedClubId &&
    clubsById.has(String(selectedClubId))
  ) {
    select.value = String(selectedClubId);
  }
}

function populatePlayersDataList() {
  const dataList =
    document.getElementById("playersDataList");

  if (!dataList) {
    console.error(
      "Elemento non trovato: playersDataList"
    );

    return;
  }

  dataList.innerHTML = "";

  players
    .filter(player => player.attivo !== false)
    .sort((playerA, playerB) => {
      const surnameComparison =
        String(playerA.cognome || "")
          .localeCompare(
            String(playerB.cognome || ""),
            "it",
            { sensitivity: "base" }
          );

      if (surnameComparison !== 0) {
        return surnameComparison;
      }

      return String(playerA.nome || "")
        .localeCompare(
          String(playerB.nome || ""),
          "it",
          { sensitivity: "base" }
        );
    })
    .forEach(player => {
      const option =
        document.createElement("option");

      const displayName =
        getPlayerDisplayName(player);

      const clubName =
        getClubName(player.csb_id);

      option.value = displayName;

      option.label = [
        player.categoria || "Categoria non indicata",
        clubName || "CSB non indicato",
        player.codice_tessera || player.id
      ].join(" · ");

      option.dataset.playerId = player.id;
      option.dataset.searchText = [
        displayName,
        player.nome,
        player.cognome,
        player.codice_tessera,
        clubName
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      dataList.appendChild(option);
    });
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
  document
  .querySelectorAll('input[name="eventSource"]')
  .forEach(radio => {
    radio.addEventListener(
      "change",
      updateEventSourceFields
    );
  });

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

	const newPlayerButton =
	  document.getElementById("newPlayerBtn");

	const newPlayerCloseButton =
	  document.getElementById("newPlayerClose");

	const newPlayerCancelButton =
	  document.getElementById("newPlayerCancel");

	const newPlayerForm =
	  document.getElementById("newPlayerForm");

	if (newPlayerButton) {
	  newPlayerButton.addEventListener(
		 "click",
		 openNewPlayerDialog
	  );
	}

	if (newPlayerCloseButton) {
	  newPlayerCloseButton.addEventListener(
		 "click",
		 closeNewPlayerDialog
	  );
	}

	if (newPlayerCancelButton) {
	  newPlayerCancelButton.addEventListener(
		 "click",
		 closeNewPlayerDialog
	  );
	}

	if (newPlayerForm) {
	  newPlayerForm.addEventListener(
		 "submit",
		 saveNewPlayer
	  );
	}

	const newClubButton =
	  document.getElementById("newClubBtn");

	const newClubCloseButton =
	  document.getElementById("newClubClose");

	const newClubCancelButton =
	  document.getElementById("newClubCancel");

	const newClubForm =
	  document.getElementById("newClubForm");

	if (newClubButton) {
	  newClubButton.addEventListener(
		 "click",
		 openNewClubDialog
	  );
	}

	if (newClubCloseButton) {
	  newClubCloseButton.addEventListener(
		 "click",
		 () => closeNewClubDialog(true)
	  );
	}

	if (newClubCancelButton) {
	  newClubCancelButton.addEventListener(
		 "click",
		 () => closeNewClubDialog(true)
	  );
	}

	if (newClubForm) {
	  newClubForm.addEventListener(
		 "submit",
		 saveNewClub
	  );
	}
	  
  ["detailDialog", "editDialog", "githubDialog", "newPlayerDialog", "newClubDialog"].forEach(id => {
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

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function findPlayerFromInputValue(value) {
  const normalizedValue =
    normalizeSearchText(value);

  if (!normalizedValue) {
    return null;
  }

  /*
    Prima cerchiamo il nome visualizzato esatto.
  */
  const exactNameMatch = players.find(player =>
    normalizeSearchText(
      getPlayerDisplayName(player)
    ) === normalizedValue
  );

  if (exactNameMatch) {
    return exactNameMatch;
  }

  /*
    Poi cerchiamo il codice tessera esatto.
  */
  const exactCardMatch = players.find(player =>
    normalizeSearchText(
      player.codice_tessera || player.id
    ) === normalizedValue
  );

  return exactCardMatch || null;
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

function openNewClubDialog() {
  const form =
    document.getElementById("newClubForm");

  const errorElement =
    document.getElementById("newClubError");

  form.reset();

  document.getElementById(
    "newClubRegion"
  ).value =
    document.getElementById(
      "newPlayerRegion"
    )?.value.trim() || "Toscana";

  document.getElementById(
    "newClubActive"
  ).checked = true;

  errorElement.textContent = "";
  errorElement.hidden = true;

  const playerDialog =
    document.getElementById("newPlayerDialog");

  if (playerDialog.open) {
    playerDialog.close();
  }

  document
    .getElementById("newClubDialog")
    .showModal();

  window.setTimeout(() => {
    document.getElementById(
      "newClubCode"
    ).focus();
  }, 50);
}

function closeNewClubDialog(
  reopenPlayerDialog = true
) {
  const clubDialog =
    document.getElementById("newClubDialog");

  if (clubDialog.open) {
    clubDialog.close();
  }

  if (reopenPlayerDialog) {
    const playerDialog =
      document.getElementById("newPlayerDialog");

    if (!playerDialog.open) {
      playerDialog.showModal();
    }
  }
}

function normalizeClubCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function normalizeClubName(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function findClubDuplicateByName(name) {
  const normalizedName =
    normalizeSearchText(name);

  if (!normalizedName) {
    return null;
  }

  return clubs.find(club =>
    normalizeSearchText(
      club.denominazione
    ) === normalizedName
  ) || null;
}

async function saveNewClub(event) {
  event.preventDefault();

  const codeInput =
    document.getElementById("newClubCode");

  const nameInput =
    document.getElementById("newClubName");

  const regionInput =
    document.getElementById("newClubRegion");

  const activeInput =
    document.getElementById("newClubActive");

  const errorElement =
    document.getElementById("newClubError");

  const saveButton =
    document.getElementById("newClubSaveBtn");

  const clubCode =
    normalizeClubCode(codeInput.value);

  const clubName =
    normalizeClubName(nameInput.value);

  const clubRegion =
    regionInput.value.trim();

  const clubActive =
    activeInput.checked;

  errorElement.textContent = "";
  errorElement.hidden = true;

  if (!clubCode || !clubName) {
    errorElement.textContent =
      "Inserisci il codice affiliazione e la denominazione del CSB.";

    errorElement.hidden = false;
    return;
  }

  const duplicateCode =
    clubs.find(club =>
      normalizeClubCode(
        club.codice_affiliazione || club.id
      ) === clubCode
    );

  if (duplicateCode) {
    errorElement.textContent =
      `Il codice ${clubCode} è già associato a ` +
      `${duplicateCode.denominazione}.`;

    errorElement.hidden = false;
    return;
  }

  const duplicateName =
    findClubDuplicateByName(clubName);

  if (duplicateName) {
    errorElement.textContent =
      `Esiste già un CSB con la denominazione ` +
      `"${duplicateName.denominazione}" e codice ` +
      `${duplicateName.codice_affiliazione || duplicateName.id}.`;

    errorElement.hidden = false;
    return;
  }

	const githubToken =
	  localStorage.getItem(
		 "personal_github_token"
	  );

	if (!githubToken) {
	  errorElement.textContent =
		 "Configura GitHub prima di aggiungere un nuovo CSB.";

	  errorElement.hidden = false;
	  return;
	}

  const newClub = {
    id: clubCode,
    codice_affiliazione: clubCode,
    denominazione: clubName,
    regione: clubRegion || "",
    provenienza: "manuale",
    attivo: clubActive
  };

  clubs.push(newClub);

  clubs.sort((clubA, clubB) =>
    String(clubA.denominazione || "")
      .localeCompare(
        String(clubB.denominazione || ""),
        "it",
        { sensitivity: "base" }
      )
  );

  buildPlayerIndexes();
  populateNewPlayerClubSelect(newClub.id);

  saveButton.disabled = true;
  saveButton.textContent = "Salvataggio...";

  try {
    await pushJsonToGitHub(
      GITHUB_CONFIG.filePathClubs,
      clubs,
      `Aggiunta CSB ${newClub.denominazione}`
    );

    closeNewClubDialog(true);

    alert(
      "CSB aggiunto e salvato su GitHub. " +
      "Il nuovo CSB è stato selezionato nel giocatore."
    );
  } catch (error) {
    console.error(
      "Errore salvataggio CSB:",
      error
    );

    /*
      Il CSB rimane disponibile nella sessione corrente.
      La tendina del giocatore lo mantiene selezionato.
    */
    closeNewClubDialog(true);

    alert(
      "Il CSB è disponibile nella sessione corrente, " +
      "ma il salvataggio su GitHub è fallito.\n\n" +
      error.message
    );
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Salva CSB";
	 closeNewClubDialog(true);
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
      month < 0 || month> 11
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

function eventFor(path) {
  const linkedEvent = events.find(
    event =>
      String(event.id) ===
      String(path.gara_id)
  );

  if (linkedEvent) {
    return linkedEvent;
  }

  return {
    id: path.gara_id,
    title:
      path.titolo_gara ||
      "Gara non presente nel calendario",

    className:
      path.className ||
      "gara-libera",

    sede:
      path.sede ||
      "Fuori regione",

    specialita:
      path.specialita ||
      path.specialita_excel ||
      "",

    punti:
      path.punti ||
      path.punti_excel ||
      ""
  };
}

function renderAll() { if (!currentUser) return; renderSummary(); renderList(); }

function renderSummary() {
  const list = selectedPaths(); const matches = list.flatMap(p => p.incontri || []);
  const wins = matches.filter(m => String(m.esito).toUpperCase() === "V").length; const losses = matches.filter(m => String(m.esito).toUpperCase() === "P").length;
  const ranking = list.reduce((s,p) => s + number(p.ranking), 0); const entries = list.reduce((s,p) => s + number(p.iscrizione), 0); const prizes = list.reduce((s,p) => s + number(p.premio), 0); const balance = prizes - entries;
  document.getElementById("summaryTournaments").textContent = list.length;
  document.getElementById("summaryMatches").textContent = matches.length;
  document.getElementById("summaryMatchesDetail").textContent = `${wins} vinte · ${losses} perse`;
  document.getElementById("summaryRanking").textContent = signed(ranking);
  const balanceEl = document.getElementById("summaryBalance"); balanceEl.textContent = euro(balance); balanceEl.className = balance > 0 ? "rank-positive" : balance < 0 ?"rank-negative" :"rank-zero" ; document.getElementById("summaryBalanceDetail").textContent=`${euro(prizes)} premi · ${euro(entries)} iscrizioni`; } function renderList() { const term=document.getElementById("searchInput" ).value.trim().toLowerCase(); const list=selectedPaths().filter(p=> eventFor(p).title.toLowerCase().includes(term)).sort((a,b) => String(b.data_giocata).localeCompare(String(a.data_giocata)));
  const body = document.getElementById("participationsBody"), mobile = document.getElementById("mobileList"); body.innerHTML = ""; mobile.innerHTML = "";
  document.getElementById("visibleCount").textContent = `${list.length} ${list.length === 1 ? "gara visualizzata" : "gare visualizzate"}`;
  if (!list.length) { body.innerHTML = '<tr>
			<td colspan="5" class="empty-row">Nessuna partecipazione trovata</td>
		</tr>'; mobile.innerHTML = '<p class="empty-row">Nessuna partecipazione trovata</p>'; return; }
  list.forEach(path => {
    const evt = eventFor(path), color = TYPE_COLORS[evt.className] || "#64748b", rankClass = number(path.ranking) > 0 ? "rank-positive" : number(path.ranking) < 0 ?"rank-negative" :"rank-zero" ; const tr=document.createElement("tr" ); tr.innerHTML=`<td>${formatDate(path.data_giocata)}</td><td><span class="type-badge" style="background:${color}">${typeLabel(evt.className)}</span>
	</td>
	<td class="event-title">${escapeHtml(evt.title)}</td>
	<td>${escapeHtml(path.risultato || "-")}</td>
	<td class="numeric ${rankClass}">${signed(number(path.ranking))}</td>`; tr.addEventListener("click", () => openDetail(path.id)); body.appendChild(tr);
    const card = document.createElement("article"); card.className = "mobile-card"; card.innerHTML = `<div class="mobile-card-top">
		<span class="type-badge" style="background:${color}">${typeLabel(evt.className)}</span>
		<strong class="mobile-card-rank ${rankClass}">${signed(number(path.ranking))}</strong>
	</div>
	<h4>${escapeHtml(evt.title)}</h4>
	<p>${formatDate(path.data_giocata)} · ${escapeHtml(path.risultato || "-")}</p>`; card.addEventListener("click", () => openDetail(path.id)); mobile.appendChild(card);
  });
}

function openDetail(id) {
  const path = paths.find(p => String(p.id) === String(id)); if (!path) return; currentPathId = path.id; const evt = eventFor(path), color = TYPE_COLORS[evt.className] || "#64748b";
  const badge = document.getElementById("detailType"); badge.textContent = typeLabel(evt.className); badge.style.background = color;
  document.getElementById("detailTitle").textContent = evt.title; 
const externalEvent =
  isExternalParticipation(path);

document.getElementById(
  "detailVenue"
).textContent = externalEvent
  ? `Gara esterna · ${
      evt.sede || "Sede non indicata"
    }`
  : evt.sede || "Sede non indicata";
  document.getElementById("detailDate").textContent = formatDate(path.data_giocata); document.getElementById("detailResult").textContent = path.risultato || "-";
  document.getElementById("detailEntry").textContent = euro(path.iscrizione); document.getElementById("detailPrize").textContent = euro(path.premio); document.getElementById("detailRanking").textContent = signed(number(path.ranking)); document.getElementById("detailBattery").textContent = path.batteria_superata ? "Superata" : "Non superata";
  const matches = [...(path.incontri || [])].sort((a,b) => number(a.ordine)-number(b.ordine)); document.getElementById("detailMatchCount").textContent = `${matches.length} ${matches.length === 1 ? "incontro" : "incontri"}`;
  const box = document.getElementById("detailMatches"); 
  box.innerHTML = ""; 
  matches.forEach(m => { 
	const row = document.createElement("div"); 
	const win = String(m.esito).toUpperCase() === "V"; 
	row.className = "match-row"; 
const historicalClub =
  m.csb ||
  getClubName(m.csb_id) ||
  "";

const categoryBadge =
  getCategoryBadge(m.categoria);

row.innerHTML = `
  <span class="match-phase">
    ${escapeHtml(m.fase || "-")}
  </span>
	<div class="match-player-info">
		<span class="opponent-category-badge
             ${categoryBadge.className}" title="${escapeAttr(
        m.categoria ||
        " Categoria non indicata" )}"> ${escapeHtml(categoryBadge.label)}
	</span>
	<div class="match-player-text">
		<strong class="match-opponent">
        ${escapeHtml(
          m.avversario || "-"
        )}
      </strong>

      ${
        historicalClub
          ? `
            <span class="match-club-name">
              ${escapeHtml(historicalClub)}
            </span>
          `
          : ""
      }

    </div>
</div>
<span class="match-result ${
    win ? " win" :"loss" }"> ${win ?"V" :"P" }
</span>
`;
	box.appendChild(row); });
  const noteSection = document.getElementById("detailNotesSection"); noteSection.hidden = !path.note?.trim(); document.getElementById("detailNotes").textContent = path.note || "";
  document.getElementById("detailDialog").showModal();
}

function openEdit(id = null) {
  currentPathId = id;

  const path = id
    ? paths.find(item =>
        String(item.id) === String(id)
      )
    : null;

  if (path) {
    const linkedEvent = events.find(event =>
      String(event.id) ===
      String(path.gara_id)
    );

    const pathSeason = linkedEvent
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

  document.getElementById(
    "editDialogTitle"
  ).textContent = path
    ? "Modifica partecipazione"
    : "Nuova partecipazione";

  document.getElementById(
    "editId"
  ).value = path?.id || "";

  const externalMode =
    isExternalParticipation(path);

  document.getElementById(
    "eventSourceCalendar"
  ).checked = !externalMode;

  document.getElementById(
    "eventSourceExternal"
  ).checked = externalMode;

  updateEventSourceFields();

  document.getElementById(
    "editEvent"
  ).value = externalMode
    ? ""
    : path?.gara_id || "";

  document.getElementById(
    "editExternalTitle"
  ).value = externalMode
    ? path?.titolo_gara || ""
    : "";

  document.getElementById(
    "editExternalType"
  ).value = externalMode
    ? path?.className || "gara-libera"
    : "gara-libera";

  document.getElementById(
    "editExternalVenue"
  ).value = externalMode
    ? path?.sede || ""
    : "";

  document.getElementById(
    "editExternalSpecialty"
  ).value = externalMode
    ? (
        path?.specialita ||
        path?.specialita_excel ||
        ""
      )
    : "";

  document.getElementById(
    "editExternalPoints"
  ).value = externalMode
    ? (
        path?.punti ||
        path?.punti_excel ||
        ""
      )
    : "";

  document.getElementById(
    "editDate"
  ).value =
    path?.data_giocata ||
    new Date().toISOString().slice(0, 10);

  document.getElementById(
    "editResult"
  ).value = path?.risultato || "";

  document.getElementById(
    "editEntry"
  ).value = path?.iscrizione ?? 0;

  document.getElementById(
    "editPrize"
  ).value = path?.premio ?? 0;

  document.getElementById(
    "editRanking"
  ).value = path?.ranking ?? "";

  document.getElementById(
    "editBattery"
  ).value = String(
    path?.batteria_superata ?? false
  );

  document.getElementById(
    "editNotes"
  ).value = path?.note || "";

  const editor =
    document.getElementById(
      "matchesEditor"
    );

  editor.innerHTML = "";

  const matches =
    [...(path?.incontri || [])]
      .sort(
        (matchA, matchB) =>
          number(matchA.ordine) -
          number(matchB.ordine)
      );

  matches.forEach(match =>
    addMatchEditorRow(match)
  );

  if (matches.length === 0) {
    addMatchEditorRow();
  }

  document
    .getElementById("editDialog")
    .showModal();
}


function closeEdit() { document.getElementById("editDialog").close(); }

function updateEventSourceFields() {
  const externalMode =
    document.getElementById(
      "eventSourceExternal"
    ).checked;

  const calendarFields =
    document.getElementById(
      "calendarEventFields"
    );

  const externalFields =
    document.getElementById(
      "externalEventFields"
    );

  calendarFields.hidden = externalMode;
  externalFields.hidden = !externalMode;
}

function isExternalParticipation(path) {
  if (!path) {
    return false;
  }

  const linkedEvent = events.find(event =>
    String(event.id) ===
    String(path.gara_id)
  );

  return !linkedEvent;
}

function addMatchEditorRow(match = {}) {
  const container =
    document.getElementById("matchesEditor");

  const row = document.createElement("div");
  row.className = "match-editor-row";

  const linkedPlayer = match.giocatore_id
    ? getPlayerById(match.giocatore_id)
    : null;

  const opponentName = linkedPlayer
    ? getPlayerDisplayName(linkedPlayer)
    : match.avversario || "";

  const playerId =
    linkedPlayer?.id ||
    match.giocatore_id ||
    "";

  const category =
    match.categoria ||
    linkedPlayer?.categoria ||
    "";

  const clubId =
    match.csb_id ||
    linkedPlayer?.csb_id ||
    "";

  row.innerHTML = `
    <input type="hidden" class="match-player-id" value="${escapeAttr(playerId)}">
	<input type="hidden" class="match-club-id" value="${escapeAttr(clubId)}">
		<label>
      Fase
      <input class="form-control match-phase-input" value="${escapeAttr(match.fase || " ")}" placeholder="1° turno">
    </label>
			<label class="match-opponent-field">
      Avversario
      <input class="form-control match-opponent-input" type="text" list="playersDataList" value="${escapeAttr(opponentName)}" placeholder="Cerca nome o cognome" autocomplete="off">
    </label>
				<label>
      Categoria
      <select class="form-control match-category-input">
        ${buildCategoryOptions(category)}
      </select>
				</label>
				<label>
      Esito
      <select class="form-control match-result-input">
						<option value="V" ${match.esito==="V" ?"selected" :"" }> Vinta
					</option>
					<option value="P" ${match.esito==="P" ?"selected" :"" }> Persa
				</option>
			</select>
		</label>
		<button class="remove-match" type="button" title="Elimina incontro">
      X
    </button>
  `;

  const opponentInput =
    row.querySelector(".match-opponent-input");

  opponentInput.addEventListener(
    "focus",
    () => {
      currentMatchEditorRow = row;
    }
  );

  opponentInput.addEventListener(
    "change",
    () => handleOpponentSelection(row)
  );

  opponentInput.addEventListener(
    "blur",
    () => {
      window.setTimeout(() => {
        handleOpponentSelection(row);
      }, 100);
    }
  );

  opponentInput.addEventListener(
    "input",
    () => {
      const hiddenPlayerId =
        row.querySelector(".match-player-id");

      const linked =
        getPlayerById(hiddenPlayerId.value);

      if (
        linked &&
        normalizeSearchText(opponentInput.value) !==
        normalizeSearchText(
          getPlayerDisplayName(linked)
        )
      ) {
        row.querySelector(
          ".match-player-id"
        ).value = "";

        row.querySelector(
          ".match-club-id"
        ).value = "";
      }
    }
  );

  row
    .querySelector(".remove-match")
    .addEventListener(
      "click",
      () => {
        if (currentMatchEditorRow === row) {
          currentMatchEditorRow = null;
        }

        row.remove();
      }
    );

  container.appendChild(row);
}

function buildCategoryOptions(selectedCategory = "") {
  const categories = [
    "Terza",
    "Seconda",
    "Prima",
    "Master",
    "Nazionale",
    "Nazionale Pro",
    "Junior",
    "Senior",
    "Coppia",
    "Non indicata"
  ];

  if (
    selectedCategory &&
    !categories.includes(selectedCategory)
  ) {
    categories.push(selectedCategory);
  }

  return categories
    .map(category => {
      const selected =
        category === selectedCategory
          ? "selected"
          : "";

      return (
        `<option value="${escapeAttr(category)}" ` + `${selected}>` + `${escapeHtml(category)}` + `< option>` ); }) .join(""); } function handleOpponentSelection(row) { const opponentInput=row.querySelector(".match-opponent-input" ); const player=findPlayerFromInputValue( opponentInput.value ); if (!player) { row.querySelector(".match-player-id" ).value="" ; row.querySelector(".match-club-id" ).value="" ; return; } row.querySelector(".match-player-id" ).value=player.id; row.querySelector(".match-club-id" ).value=player.csb_id ||"" ; opponentInput.value=getPlayerDisplayName(player); row.querySelector(".match-category-input" ).value=player.categoria ||"Non indicata" ; } async function saveEdit(event) { event.preventDefault(); const existingId=document .getElementById("editId") .value; const participationId=existingId || `${currentUser.id}-${Date.now()}`; const externalMode=document.getElementById( "eventSourceExternal" ).checked; const playedDate=document.getElementById( "editDate" ).value; let eventId; let participationSeason; let externalData={}; if (externalMode) { const externalTitle=document .getElementById("editExternalTitle" ) .value .trim(); if (!externalTitle) { alert("Inserisci il titolo della gara esterna." ); document .getElementById("editExternalTitle" ) .focus(); return; } const existingPath=existingId ? paths.find(path=>
            String(path.id) ===
            String(existingId)
          )
        : null;

    if (
      existingPath &&
      isExternalParticipation(existingPath)
    ) {
      eventId = existingPath.gara_id;
    } else {
      eventId =
        `storico-${playedDate}-${Date.now()}`;
    }

    participationSeason =
      getSeasonFromDate(playedDate);

    externalData = {
      titolo_gara: externalTitle,

      className:
        document
          .getElementById(
            "editExternalType"
          )
          .value,

      sede:
        document
          .getElementById(
            "editExternalVenue"
          )
          .value
          .trim(),

      specialita:
        document
          .getElementById(
            "editExternalSpecialty"
          )
          .value
          .trim(),

      punti:
        document
          .getElementById(
            "editExternalPoints"
          )
          .value
          .trim()
    };
  } else {
    eventId =
      document
        .getElementById("editEvent")
        .value;

    if (!eventId) {
      alert(
        "Seleziona una gara dal calendario."
      );

      document
        .getElementById("editEvent")
        .focus();

      return;
    }

    const selectedEvent =
      events.find(calendarEvent =>
        String(calendarEvent.id) ===
        String(eventId)
      );

    if (!selectedEvent) {
      alert(
        "La gara selezionata non è disponibile."
      );

      return;
    }

    participationSeason =
      getEventSeason(selectedEvent);
  }

const matches = [
  ...document.querySelectorAll(
    ".match-editor-row"
  )
]
  .map((row, index) => {
    const playerId =
      row
        .querySelector(".match-player-id")
        .value
        .trim();

    const clubId =
      row
        .querySelector(".match-club-id")
        .value
        .trim();

    const opponentName =
      row
        .querySelector(".match-opponent-input")
        .value
        .trim();

    const category =
      row
        .querySelector(".match-category-input")
        .value;

    const linkedPlayer =
      playerId
        ? getPlayerById(playerId)
        : null;

    const historicalClubName =
      clubId
        ? getClubName(clubId)
        : "";

    const match = {
      id: Date.now() + index,
      ordine: index + 1,

      fase:
        row
          .querySelector(".match-phase-input")
          .value
          .trim(),

      avversario:
        linkedPlayer
          ? getPlayerDisplayName(linkedPlayer)
          : opponentName,

      categoria: category,

      esito:
        row
          .querySelector(".match-result-input")
          .value
    };

    if (playerId) {
      match.giocatore_id = playerId;
    }

    if (clubId) {
      match.csb_id = clubId;
    }

    if (historicalClubName) {
      match.csb = historicalClubName;
    }

    return match;
  })
  .filter(match =>
    match.avversario !== ""
  );

  const rankingValue =
    document
      .getElementById("editRanking")
      .value;

  const path = {
    id: participationId,
    utente_id: currentUser.id,
    gara_id: eventId,
    stagione:
      participationSeason ||
      currentSeason,
    data_giocata: playedDate,

    iscrizione:
      number(
        document.getElementById(
          "editEntry"
        ).value
      ),

    premio:
      number(
        document.getElementById(
          "editPrize"
        ).value
      ),

    risultato:
      document
        .getElementById(
          "editResult"
        )
        .value
        .trim(),

    ranking:
      rankingValue === ""
        ? null
        : number(rankingValue),

    batteria_superata:
      document
        .getElementById(
          "editBattery"
        )
        .value === "true",

    note:
      document
        .getElementById(
          "editNotes"
        )
        .value
        .trim(),

    incontri: matches,

    ...externalData
  };

  const pathIndex =
    paths.findIndex(item =>
      String(item.id) ===
      String(participationId)
    );

  if (pathIndex >= 0) {
    paths[pathIndex] = path;
  } else {
    paths.push(path);
  }

  currentSeason =
    participationSeason ||
    currentSeason;

  closeEdit();
  populateSeasons();

  document.getElementById(
    "seasonSelector"
  ).value = currentSeason;

  populateEventSelect();
  renderAll();

  await trySync();
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
      "In modalità offline non è possibile " +
      "aggiornare GitHub."
    );

    return;
  }

  if (!token) {
    alert(
      "GitHub non è configurato. " +
      "Inserisci il token per pubblicare " +
      "la modifica."
    );

    openGitHubSettings();
    return;
  }

  if (githubSaveInProgress) {
    console.warn(
      "Salvataggio GitHub già in corso."
    );

    return;
  }

  githubSaveInProgress = true;

  const saveButton =
    document.querySelector(
      '#editForm button[type="submit"]'
    );

  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent =
      "Salvataggio...";
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
      "La modifica è visibile nella pagina, " +
      "ma la sincronizzazione GitHub è fallita.\n\n" +
      error.message
    );
  } finally {
    githubSaveInProgress = false;

    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = "Salva";
    }
  }
}

async function pushJsonToGitHub(
  filePath,
  data,
  message,
  attempt = 1
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

  const owner = GITHUB_CONFIG.owner;
  const repo = GITHUB_CONFIG.repo;
  const branch = GITHUB_CONFIG.branch;

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
    Aggiungo un parametro variabile per evitare
    che il browser riutilizzi una risposta GET
    precedentemente memorizzata.
  */
  const shaUrl =
    `${url}?ref=${encodeURIComponent(branch)}` +
    `&_=${Date.now()}`;

  const getResponse = await fetch(
    shaUrl,
    {
      method: "GET",
      headers,
      cache: "no-store"
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

  console.log(
    `Tentativo ${attempt}, SHA recuperato:`,
    currentFile.sha
  );

  const jsonString =
    JSON.stringify(data, null, 2);

  const utf8Bytes =
    new TextEncoder().encode(jsonString);

  let binaryString = "";

  for (
    let index = 0;
    index < utf8Bytes.length;index++ ) { binaryString +=String.fromCharCode( utf8Bytes[index] ); } const putBody={ message, content: btoa(binaryString), sha: currentFile.sha, branch }; const putResponse=await fetch( url, { method:"PUT" , headers, body: JSON.stringify(putBody) } ); * Lo SHA non è più corrente. Attendiamo e ripetiamo l'intero ciclo, compresa una nuova lettura dello SHA. * if ( putResponse.status===409 && attempt
			< 4 ) { const waitMilliseconds=attempt * 1500; console.warn( `Conflitto GitHub 409. ` + `Nuovo tentativo tra ` + `${waitMilliseconds} ms.` ); await wait(waitMilliseconds); return pushJsonToGitHub( filePath, data, message, attempt + 1 ); } if (!putResponse.ok) { const errorText=await putResponse.text(); throw new Error( `Errore durante la scrittura di ` + `${filePath}: ` + `${putResponse.status} ${errorText}` ); } return await putResponse.json(); } function wait(milliseconds) { return new Promise(resolve=> {
    setTimeout(resolve, milliseconds);
  });
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
