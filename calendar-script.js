    const typeColors = { 'nbc': '#DC2626', 'istituzionale': '#0066cc', 'coppie-base': '#C96FF2', 'seniores': '#D97706', 'femminile': '#FF69B4', 'gara-libera': '#059669' };
    const monthNamesLong = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    
    // Rilevamento automatico della data odierna
    const today = new Date();
    const currentRealMonth = today.getMonth(); 
    const currentRealYear = today.getFullYear();
    
    let activeViewType = 'year';
    let seasonStartYear = (currentRealMonth >= 7) ? currentRealYear : currentRealYear - 1;
    let currentGridYear = currentRealYear;
    let currentGridMonth = currentRealMonth; 
    
    let rawEvents = [];
    let currentActiveEvents = [];

    // --- VARIABILI GLOBALI E COSTRUTTI PER L'AMMINISTRAZIONE ---
    let isAdminAuthenticated = false;
    let githubConfig = { token: "", username: "", repo: "", sha: "" };

    // Ascolto della combinazione segreta di tasti (Ctrl + Shift + A) per aprire il Login
    window.addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'A') {
        e.preventDefault();
        document.getElementById('adminLoginDialog').showModal();
        // Pre-compila se ci sono già dati salvati localmente
        document.getElementById('cfgUsername').value = localStorage.getItem('fb_git_user') || '';
        document.getElementById('cfgRepo').value = localStorage.getItem('fb_git_repo') || '';
        document.getElementById('cfgToken').value = localStorage.getItem('fb_git_token') || '';
      }
    });

    // --- ACCESSO SEGRETO UNIFICATO (3 TOCCHI / CLICK SUL LOGO) ---
    let logoClickCount = 0;
    let logoClickTimeout;

    function triggerSecretLogin() {
      logoClickCount++;
      
      // Resetta il conteggio se l'utente smette di cliccare per più di 2 secondi
      clearTimeout(logoClickTimeout);
      logoClickTimeout = setTimeout(() => { logoClickCount = 0; }, 2000);

      // Al terzo click/tocco consecutivo apre il pannello
      if (logoClickCount === 3) {
        logoClickCount = 0;
        document.getElementById('adminLoginDialog').showModal();
        // Pre-compila se ci sono già dati salvati
        document.getElementById('cfgUsername').value = localStorage.getItem('fb_git_user') || '';
        document.getElementById('cfgRepo').value = localStorage.getItem('fb_git_repo') || '';
        document.getElementById('cfgToken').value = localStorage.getItem('fb_git_token') || '';
      }
    }

    // Inizializzazione automatica dello stato Admin al caricamento della pagina
    function checkAdminSession() {
      const storedToken = localStorage.getItem('fb_git_token');
      const storedUser = localStorage.getItem('fb_git_user');
      const storedRepo = localStorage.getItem('fb_git_repo');
      
      if (storedToken && storedUser && storedRepo) {
        githubConfig.token = storedToken;
        githubConfig.username = storedUser;
        githubConfig.repo = storedRepo;
        isAdminAuthenticated = true;
        document.body.classList.add('is-admin');
        console.log("🛠️ Modalità Amministratore Attiva con successo.");
      }
    }

    function saveAdminConfiguration() {
      const u = document.getElementById('cfgUsername').value.trim();
      const r = document.getElementById('cfgRepo').value.trim();
      const t = document.getElementById('cfgToken').value.trim();
      
      if(!u || !r || !t) {
        alert("Tutti i campi sono obbligatori per connettersi a GitHub!");
        return;
      }
      
      localStorage.setItem('fb_git_user', u);
      localStorage.setItem('fb_git_repo', r);
      localStorage.setItem('fb_git_token', t);
      
      githubConfig.username = u;
      githubConfig.repo = r;
      githubConfig.token = t;
      isAdminAuthenticated = true;
      
      document.body.classList.add('is-admin');
      document.getElementById('adminLoginDialog').close();
      filterAndRenderEvents(); // Riesegue il render per mostrare le funzioni interattive
      alert("Autenticazione salvata nel browser. Modalità amministratore abilitata!");
    }

    function logoutAdmin() {
      localStorage.removeItem('fb_git_user');
      localStorage.removeItem('fb_git_repo');
      localStorage.removeItem('fb_git_token');
      isAdminAuthenticated = false;
      document.body.classList.remove('is-admin');
      document.getElementById('adminLoginDialog').close();
      filterAndRenderEvents();
      alert("Disconnessione effettuata. Il calendario è tornato in sola lettura.");
    }

    async function pushToGitHub(updatedArray) {
      if (!isAdminAuthenticated) return;
      
      const titleLabel = document.getElementById('calendarTitle');
      const originalTitle = titleLabel.innerText;
      titleLabel.innerText = "🔄 Sincronizzazione con GitHub in corso...";

      //const url = `https://github.com{githubConfig.username}/${githubConfig.repo}/contents/gare.json`;
	  const url = `https://api.github.com/repos/${githubConfig.username}/${githubConfig.repo}/contents/gare.json`;
      
      try {
        // 1. RECUPERO DELLO SHA (Ripristinato standard 'token' ufficiale di GitHub)
        const getRes = await fetch(url, {
          method: "GET",
          headers: { 
            "Authorization": `Bearer ${githubConfig.token}`, // <-- RIPRISTINATO STANDARD CORRETTO
            "Accept": "application/vnd.github.v3+json"
            //"Cache-Control": "no-cache"
          }
        });
        
        if (!getRes.ok) {
          const errStatus = getRes.status;
          const errText = await getRes.text();
          alert(`⚠️ GITHUB API ALERT (Fase SHA):\nCodice Stato: ${errStatus}\nRisposta: ${errText}`);
          titleLabel.innerText = originalTitle;
          return;
        }
        
        const getData = await getRes.json();
        githubConfig.sha = getData.sha;

        // 2. CODIFICA BASE64 ULTRA-SICURA (Previene i crash da caratteri accentati ed emoji)
        const jsonString = JSON.stringify(updatedArray, null, 2);
        const utf8Bytes = new TextEncoder().encode(jsonString);
        let binaryString = "";
        for (let i = 0; i < utf8Bytes.length; i++) {
          binaryString += String.fromCharCode(utf8Bytes[i]);
        }
        const base64Payload = btoa(binaryString); // Codifica sicura al 100%

        const putBody = {
          message: "Aggiornamento calendario gare da pannello di amministrazione",
          content: base64Payload
        };
        if (githubConfig.sha) putBody.sha = githubConfig.sha;

        // 3. TENTATIVO DI SALVATAGGIO (Ripristinato standard 'token' ufficiale di GitHub)
        const putRes = await fetch(url, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${githubConfig.token}`, // <-- RIPRISTINATO STANDARD CORRETTO
            "Content-Type": "application/json",
            "Accept": "application/vnd.github.v3+json"
          },
          body: JSON.stringify(putBody)
        });

        if (!putRes.ok) {
          const putStatus = putRes.status;
          const putText = await putRes.text();
          alert(`⚠️ GITHUB API ALERT (Fase PUT):\nCodice Stato: ${putStatus}\nRisposta: ${putText}`);
          titleLabel.innerText = originalTitle;
          return;
        }

        titleLabel.innerText = originalTitle;
        alert("🎉 Database sincronizzato con successo su GitHub! Le modifiche saranno visibili online tra pochi istanti.");
        
        rawEvents = [...updatedArray];
        filterAndRenderEvents();

      } catch (err) {
        console.error("Errore di rete intercettato:", err);
        titleLabel.innerText = originalTitle;
        alert(`❌ ERRORE DI RETE RISCONTRATO:\nNome: ${err.name}\nDettaglio: ${err.message}\n\nSe l'errore persiste, esegui il logout dai 3 tocchi sul logo e rifai l'accesso controllando le maiuscole del nome utente e del repository.`);
      }
    }

    // Aggiornamento grafico dinamico del badge colore nel modale se l'admin cambia la selezione
    function updateModalBadgePreview(value) {
      const typeBadge = document.getElementById('modalTipologia');
      typeBadge.innerText = value.replace('-', ' ');
      typeBadge.style.backgroundColor = typeColors[value] || '#64748b';
    }

    function parseDateSafe(dateString) {
      if (!dateString) return null;
      const parts = dateString.trim().split('-');
      if (parts.length === 3) return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) - 1, day: parseInt(parts[2], 10) };
      return null;
    }

	function getEventVisualState(evt) {
	  const oggi = new Date();
	  oggi.setHours(0, 0, 0, 0);

	  const startParts = parseDateSafe(evt.start);
	  const endParts = parseDateSafe(evt.end_date || evt.start);

	  if (!startParts || !endParts) {
		 return 'pianificata';
	  }

	  const dataInizio = new Date(
		 startParts.year,
		 startParts.month,
		 startParts.day
	  );

	  const dataFine = new Date(
		 endParts.year,
		 endParts.month,
		 endParts.day
	  );

	  const statoAmministrativo =
		 (evt.stato || 'ufficiale').trim().toLowerCase();

	  // Una gara non ancora ufficializzata resta pianificata,
	  // indipendentemente dalle date.
	  if (statoAmministrativo === 'pianificata') {
		 return 'pianificata';
	  }

	  if (oggi > dataFine) {
		 return 'conclusa';
	  }

	  /*if (oggi >= dataInizio && oggi <= dataFine) {
		 return 'in-corso';
	  }*/

	  return 'in-programma';
	}

	function getEventStatusLabel(evt) {
	  const stato = getEventVisualState(evt);

	  const labels = {
		 'pianificata': 'Pianificata',
		 'in-programma': 'Ufficiale / in programma',
		 'in-corso': 'In corso',
		 'conclusa': 'Conclusa'
	  };

	  return labels[stato] || 'In programma';
	}

	function checkFilterGroup(selector) {
	  document.querySelectorAll(selector).forEach(cb => {
		 cb.checked = true;
	  });

	  filterAndRenderEvents();
	}
	function clearFilterGroup(selector) {
	  document.querySelectorAll(selector).forEach(cb => {
		cb.checked = false;
	  });

	  filterAndRenderEvents();
	}

    // 1. CARICAMENTO DATI DAL FILE JSON (Immediato, sicuro e senza blocchi CORS)
    async function loadEvents() {
      const titleLabel = document.getElementById('calendarTitle');
      titleLabel.innerText = "Caricamento in corso...";
      
      // Essendo nello stesso spazio web di GitHub, basta chiamare direttamente il nome del file!
      const url = "gare.json";
      
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("File JSON non trovato");
        rawEvents = await response.json();
        
        // Pulisce preventivamente i testi da spazi o maiuscole errate
        rawEvents.forEach(evt => {
          if (evt.className) evt.className = evt.className.toLowerCase().trim();
          if (evt.separate) evt.separate = evt.separate.toUpperCase().trim();
          if (evt.handicap) evt.handicap = evt.handicap.toUpperCase().trim();
          if (evt.arbitri) evt.arbitri = evt.arbitri.trim();
        });

        currentActiveEvents = [...rawEvents];
        switchView('year');
        titleLabel.innerText = "Calendario Gare Stagionale";
      } catch (e) {
        console.error("Errore:", e);
        
        // DATI DI EMERGENZA PER IL TUO COMPUTER (Falli corrispondere alla stagione attuale per vederli subito)
        rawEvents = [
          {
            "title": "Gran TEST Orizzontale",
            "className": "gara-libera",
            "start": "2026-08-10",
            "end_date": "2026-08-16",
            "sede": "ASD Biliardo Club Firenze",
            "premio": "€ 3.500",
            "iscrizione": "€ 50",
				"entro": "2026-08-01",
            "specialita": "Singola - 5 Birilli",
            "categorie": "Prima, Master, Nazionale, Nazionale Pro",
            "separate": "NO",
            "handicap": "NO",
            "arbitri": "SI",
            "locandina": "https://trello.com/1/cards/6a1ef16fed0f146c784aa1a3/attachments/6a1ef1861cd5e812f73c8953/download/torneo_estivo_ansa_2026.jpg"
          },
          {
            "title": "Gran TEST Verticale",
            "className": "nbc",
				"stato": "pianificata",
            "start": "2026-10-05",
            "end_date": "2026-10-12",
            "sede": "ASD Club Diamante",
            "premio": "€ 2.500",
            "iscrizione": "€ 40",
				"entro": "2026-10-01",
            "specialita": "Singola - 5 Birilli",
            "categorie": "Terza, Seconda, Prima",
            "separate": "SI",
            "handicap": "NO",
            "arbitri": "SI",
            "locandina": "https://trello.com/1/cards/6a32d443140bdfc68e715dfe/attachments/6a32d45b689d3cbf84b01c8f/download/londa_2026.jpg"
          },
          {
            "title": "Gran TEST Centrale",
            "className": "nbc",
				"stato": "ufficiale",
            "start": "2026-10-05",
            "end_date": "2026-11-12",
            "sede": "ASD Club Diamante",
            "premio": "€ 2.500",
            "iscrizione": "€ 40",
				"entro": "2026-10-01",
            "specialita": "Singola - 5 Birilli",
            "categorie": "Terza, Seconda, Prima",
            "separate": "SI",
            "handicap": "NO",
            "arbitri": "SI",
            "locandina": "https://trello.com/1/cards/6a32d443140bdfc68e715dfe/attachments/6a32d45b689d3cbf84b01c8f/download/londa_2026.jpg"
          }
        ];
        
        currentActiveEvents = [...rawEvents];
        switchView('year');
        titleLabel.innerText = "Calendario (Anteprima Offline)";
      }
      checkAdminSession();
    }

    function switchView(viewType) {
      activeViewType = viewType;
      const viewYear = document.getElementById('viewYear');
      const viewMonth = document.getElementById('viewMonth');
      const viewList = document.getElementById('viewList');
      const navBlock = document.getElementById('universalNavigation');
      const title = document.getElementById('calendarTitle');

      ['btnYear', 'btnMonth', 'btnList'].forEach(id => {
        const b = document.getElementById(id);
        if (b) { b.style.background = 'transparent'; b.style.color = '#64748b'; b.style.boxShadow = 'none'; }
      });

      // Ora lasciamo TUTTI i contenitori pronti
      viewYear.style.display = 'none'; 
      viewMonth.style.display = 'none'; 
      viewList.style.display = 'none';
      navBlock.style.display = 'flex'; // <-- IMPORTANTE: Resta visibile in tutte e tre le viste!

      const activeBtn = document.getElementById('btn' + viewType.charAt(0).toUpperCase() + viewType.slice(1));
      if (activeBtn) { activeBtn.style.background = '#ffffff'; activeBtn.style.color = '#0f172a'; activeBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }

      if (viewType === 'year') {
        viewYear.style.display = 'grid';
        title.innerText = "Calendario Gare Stagionale";
      } else if (viewType === 'month') {
        viewMonth.style.display = 'block';
        title.innerText = "Calendario Gare Mensile";
      } else {
        viewList.style.display = 'block'; 
        title.innerText = "Elenco Gare per Stagione";
      }
      
      updateNavigationLabel();
      filterAndRenderEvents();
    }

    function navigateCalendar(direction) {
      if (activeViewType === 'year' || activeViewType === 'list') {
        // Se siamo in vista annuale o elenco, cambiamo l'anno della stagione sportiva
        seasonStartYear += direction;
        // Se siamo in vista elenco, aggiorniamo anche l'anno della griglia mensile per tenerli allineati
        if (activeViewType === 'list') {
          currentGridYear = seasonStartYear;
        }
        filterAndRenderEvents();
      } else if (activeViewType === 'month') {
        currentGridMonth += direction;
        if (currentGridMonth > 11) { currentGridMonth = 0; currentGridYear++; }
        else if (currentGridMonth < 0) { currentGridMonth = 11; currentGridYear--; }
        renderMonthGridCalendar(currentActiveEvents);
      }
      updateNavigationLabel();
    }

    function updateNavigationLabel() {
      const label = document.getElementById('currentCalendarLabel');
      if (!label) return;
      if (activeViewType === 'year' || activeViewType === 'list') {
        label.innerText = "Stagione " + seasonStartYear + " / " + (seasonStartYear + 1);
      } else if (activeViewType === 'month') {
        label.innerText = monthNamesLong[currentGridMonth] + " " + currentGridYear;
      }
    }

    function updateAllViews(eventsToDisplay) {
      renderYearCalendar(eventsToDisplay);
      renderMonthGridCalendar(eventsToDisplay);
      renderListCalendar(eventsToDisplay);
    }

    function renderYearCalendar(eventsToDisplay) {
      const grid = document.getElementById('viewYear');
      grid.innerHTML = '';
      for (let i = 0; i < 12; i++) {
        let m = (8 + i) % 12;
        let targetYear = (m < 8) ? seasonStartYear + 1 : seasonStartYear;

        const monthBox = document.createElement('div');
        monthBox.onclick = (e) => {
          if (isAdminAuthenticated && e.target === monthBox || e.target.tagName === 'H3' || e.target.className === 'event-list') {
            const padMonth = String(m + 1).padStart(2, '0');
            createNewEventForm(`${targetYear}-${padMonth}-01`);
          }
        };
        monthBox.className = 'month-box';
        monthBox.innerHTML = `<h3 class="month-title">${monthNamesLong[m]} ${targetYear}</h3>`;
        const eventList = document.createElement('div');
        eventList.className = 'event-list';

        const monthEvents = eventsToDisplay.filter(evt => {
          const p = parseDateSafe(evt.end_date || evt.start);
          return p && p.year === targetYear && p.month === m;
        });

        if (monthEvents.length === 0) {
          eventList.innerHTML = `<p style="font-size: 0.75rem; color: #94a3b8; margin: 4px 0; font-style: italic;">Nessun torneo</p>`;
        } else {
          monthEvents.sort((a, b) => parseDateSafe(a.end_date || a.start).day - parseDateSafe(b.end_date || b.start).day);
          monthEvents.forEach(evt => {
            const parsedData = parseDateSafe(evt.end_date || evt.start);
            const color = typeColors[evt.className] || '#64748b';
            const item = document.createElement('div');
				const visualState = getEventVisualState(evt);
            item.className = `event-item event-status-${visualState}`;
            item.style.borderLeft = `4px solid ${color}`;
            item.onclick = () => openDialog(evt);
            item.innerHTML = `<span class="event-day">Fin. ${parsedData.day}</span><span class="event-name">${evt.title}</span>`;
            eventList.appendChild(item);
          });
        }
        monthBox.appendChild(eventList); grid.appendChild(monthBox);
      }
    }

    function renderMonthGridCalendar(eventsToDisplay) {
      const gridBody = document.getElementById('monthDaysGrid');
      if (!gridBody) return;
      gridBody.innerHTML = '';

      const firstDayIndex = new Date(currentGridYear, currentGridMonth, 1).getDay();
      const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
      const totalDays = new Date(currentGridYear, currentGridMonth + 1, 0).getDate();

      for (let i = 0; i < startOffset; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'grid-day-cell empty';
        gridBody.appendChild(emptyCell);
      }

      for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement('div');
        cell.onclick = (e) => {
          if (isAdminAuthenticated && e.target.className.includes('grid-day-cell') || e.target.className.includes('grid-day-number')) {
            const padMonth = String(currentGridMonth + 1).padStart(2, '0');
            const padDay = String(day).padStart(2, '0');
            createNewEventForm(`${currentGridYear}-${padMonth}-${padDay}`);
          }
        };
        cell.className = 'grid-day-cell';
        cell.innerHTML = `<div class="grid-day-number">${day}</div>`;

        const dayEvents = eventsToDisplay.filter(evt => {
          const p = parseDateSafe(evt.end_date || evt.start);
          return p && p.year === currentGridYear && p.month === currentGridMonth && p.day === day;
        });

        dayEvents.forEach(evt => {
          const badge = document.createElement('div');
			 const visualState = getEventVisualState(evt);
			 badge.className = `grid-event-badge event-status-${visualState}`;
          badge.className = 'grid-event-badge';
          //badge.style.backgroundColor = typeColors[evt.className] || '#64748b';
			 badge.style.borderLeft = `4px solid ${typeColors[evt.className] || '#64748b'}`;
          badge.innerText = evt.title;
          badge.onclick = (e) => { e.stopPropagation(); openDialog(evt); };
          cell.appendChild(badge);
        });
        gridBody.appendChild(cell);
      }

      const totalCellsGenerated = startOffset + totalDays;
      const remainingCells = (7 - (totalCellsGenerated % 7)) % 7;
      for (let i = 0; i < remainingCells; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'grid-day-cell empty';
        gridBody.appendChild(emptyCell);
      }
    }

    function renderListCalendar(eventsToDisplay) {
      const tbody = document.getElementById('eventTableBody');
      if (!tbody) return;
      tbody.innerHTML = '';

      // Filtra gli eventi per mostrare SOLO quelli della stagione agonistica selezionata (Settembre - Agosto)
      const seasonalEvents = eventsToDisplay.filter(evt => {
        const p = parseDateSafe(evt.end_date || evt.start);
        if (!p) return false;
        // Un evento appartiene alla stagione se:
        // Cade da Settembre a Dicembre dell'anno d'inizio OPPURE da Gennaio ad Agosto dell'anno successivo
        return (p.month >= 8 && p.year === seasonStartYear) || (p.month < 8 && p.year === (seasonStartYear + 1));
      });

      if (seasonalEvents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:2rem; font-style:italic;">Nessun torneo in programma per questa stagione</td></tr>`;
        return;
      }

      // ORDINA DAL PIÙ VECCHIO AL PIÙ RECENTE
      seasonalEvents.sort((a, b) => {
        const pA = parseDateSafe(a.end_date || a.start);
        const pB = parseDateSafe(b.end_date || b.start);
        return new Date(pA.year, pA.month, pA.day) - new Date(pB.year, pB.month, pB.day);
      });

      seasonalEvents.forEach(evt => {
        const tr = document.createElement('tr');
		  const visualState = getEventVisualState(evt);
		  tr.className = `event-row event-status-${visualState}`;
        tr.className = 'event-row';
        tr.onclick = () => openDialog(evt);

        const labelText = evt.className ? evt.className.replace('-', ' ') : 'torneo';
        const color = typeColors[evt.className] || '#64748b';
        const p = parseDateSafe(evt.end_date || evt.start);
        const formattedDate = p ? `${p.day}/${p.month + 1}/${p.year}` : evt.start;
		  const statusLabel = getEventStatusLabel(evt);

		  tr.innerHTML = `
		    <td>
			   <span class="badge-type" style="background-color:${color}">
				  ${labelText}
			   </span>

			   <div class="event-status-text event-status-text-${visualState}">
			  	  ${statusLabel}
			   </div>
		    </td>

		    <td style="font-weight:600;">
			   ${evt.title}
		    </td>

		    <td>${evt.sede || '-'}</td>

		    <td style="font-weight:600;">
			   ${formattedDate}
		    </td>
		  `;
        tbody.appendChild(tr);
      });
    }

    function openDialog(evt) {
      document.getElementById('modalTitle').innerText = evt.title;
      document.getElementById('modalSede').innerText = evt.sede || '-';
      document.getElementById('modalPremio').innerText = evt.premio || '-';
      document.getElementById('modalIscrizione').innerText = evt.iscrizione || 'Non specificata';
		document.getElementById('editStato').value = evt.stato || 'ufficiale';
		document.getElementById('editVincitore').value = evt.vincitore || '';		
		
      // Scrive la specialità nella nuova scatola protetta
      document.getElementById('modalSpecialita').innerText = evt.specialita || '-';
      
      const pEntro = parseDateSafe(evt.entro);
      document.getElementById('modalEntro').innerText = pEntro ? `${pEntro.day} ${monthNamesLong[pEntro.month]} ${pEntro.year}` : evt.entro;
      const pStart = parseDateSafe(evt.start);
      document.getElementById('modalInizio').innerText = pStart ? `${pStart.day} ${monthNamesLong[pStart.month]} ${pStart.year}` : evt.start;
      const pEnd = parseDateSafe(evt.end_date);
      document.getElementById('modalFinale').innerText = pEnd ? `${pEnd.day} ${monthNamesLong[pEnd.month]} ${pEnd.year}` : 'Stesso giorno';

      const typeBadge = document.getElementById('modalTipologia');
      typeBadge.innerText = evt.className ? evt.className.replace('-', ' ') : 'Torneo';
      typeBadge.style.backgroundColor = typeColors[evt.className] || '#64748b';

      // Disegna i quadratini delle categorie ammesse con il bordino grigio scuro uniformato
      const catContainer = document.getElementById('modalCategorie');
      catContainer.innerHTML = '';
      if (evt.categorie) {
        evt.categorie.split(',').forEach(cat => {
          const span = document.createElement('span');
          span.className = "category-tag";
          span.innerText = cat.trim();
          catContainer.appendChild(span);
        });
      }

      setTechLabel('badgeSeparate', evt.separate);
      setTechLabel('badgeHandicap', evt.handicap);
      setTechLabel('badgeArbitri', evt.arbitri);

      // Caricamento locandina: si adatterà da sola al quadrato fisso a sinistra
      const imgEl = document.getElementById('modalLocandina');
      imgEl.src = (evt.locandina && evt.locandina.trim() !== "") ? evt.locandina : "https://placehold.co";

		const winnerBox = document.getElementById('winnerBox');

		const winnerText = document.getElementById('modalVincitore');

		if (evt.vincitore && evt.vincitore.trim()) {
		  winnerText.innerText = evt.vincitore.trim();
		  winnerBox.style.display = 'block';
		} else {
		  winnerText.innerText = '';
		  winnerBox.style.display = 'none';
		}

      document.getElementById('eventDialog').showModal();
    }

	function setTechLabel(id, val) {
	  const el = document.getElementById(id);
	  if(!el) return;

	  const clean = val ? val.trim() : 'NO';

	  el.innerText = clean;

	  if (clean === 'SI') {
		el.className = 'tech-si';
	  } else if (clean === '1 su 2') {
		el.className = 'tech-parziale';
	  } else {
		el.className = 'tech-no';
	  }
	}
	
    function filterAndRenderEvents() {
      const activeTypes = Array.from(document.querySelectorAll('.filter-checkbox:checked')).map(c => c.value.trim().toLowerCase());
      const activeCats = Array.from(document.querySelectorAll('.filter-cat-checkbox:checked')).map(c => c.value.trim().toLowerCase());
      const activeHandicaps = Array.from(document.querySelectorAll('.filter-handicap-checkbox:checked')).map(c => c.value.trim().toUpperCase());

      currentActiveEvents = rawEvents.filter(evt => {
        const matchType = activeTypes.includes(evt.className);
        const matchHandicap = activeHandicaps.includes(evt.handicap);
        
        let matchCategory = false;
        if (evt.categorie) {
          matchCategory = evt.categorie.split(',').some(cat => {
            const trimmedCat = cat.trim().toLowerCase();
            if (trimmedCat.includes("nazionale")) return activeCats.includes("nazionale");
            return activeCats.includes(trimmedCat);
          });
        } else { matchCategory = true; }
        return matchType && matchHandicap && matchCategory;
      });

      updateAllViews(currentActiveEvents);
    }

    document.querySelectorAll('.filter-checkbox, .filter-cat-checkbox, .filter-handicap-checkbox').forEach(cb => {
      cb.addEventListener('change', filterAndRenderEvents);
    });

    // Avvio e configurazione iniziale automatica da file JSON localizzato
    loadEvents();

    // FUNZIONE INTERATTIVA PER APRIRE/CHIUDERE I FILTRI SU SMARTPHONE
    function toggleSidebar(open) {
      const sidebar = document.getElementById('sidebarMenu');
      const overlay = document.getElementById('sidebarOverlay');
      
      // Eseguiamo il controllo solo se siamo su schermi mobili (sotto i 768px)
      if (window.innerWidth < 768) {
        if (open) {
          sidebar.classList.add('active');
          overlay.style.display = 'block';
          document.body.style.overflow = 'hidden'; // Blocca lo scorrimento della pagina sotto
        } else {
          sidebar.classList.remove('active');
          overlay.style.display = 'none';
          document.body.style.overflow = ''; // Riattiva lo scorrimento
        }
      }
    }

    /* Se l'utente clicca un filtro da mobile, chiudiamo automaticamente il menu per fargli vedere il risultato
    document.querySelectorAll('.filter-checkbox, .filter-cat-checkbox, .filter-handicap-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        if (window.innerWidth < 768) {
          // Un piccolo delay di 200 millisecondi per dare il tempo visivo di vedere la spunta
          setTimeout(() => toggleSidebar(false), 200);
        }
      });
    });*/
	 
    // PREPARAZIONE MODULO PER NUOVA GARA (Svuota il Dialog e lo imposta in scrittura)
    function createNewEventForm(defaultDate = "") {
      document.getElementById('editEventId').value = "NEW_" + Date.now();
      document.getElementById('modalTitle').innerText = "Inserimento Nuova Gara";
      document.getElementById('editTitle').value = "";
      document.getElementById('editSede').value = "";
      document.getElementById('editPremio').value = "€ ";
      document.getElementById('editIscrizione').value = "€ ";
		document.getElementById('editStato').value = 'pianificata';
		document.getElementById('editVincitore').value = '';
		
      const todayISO = defaultDate || new Date().toISOString().split('T')[0];
      document.getElementById('editEntro').value = todayISO;
      document.getElementById('editStart').value = todayISO;
      document.getElementById('editEndDate').value = todayISO;
      
      document.getElementById('editSpecialita').value = "";
      document.getElementById('editCategorie').value = "Nazionale / Naz. Pro, Master, Prima, Seconda, Terza";
      
      document.getElementById('editClassName').value = "gara-libera";
      updateModalBadgePreview("gara-libera");
      
      document.getElementById('editSeparate').value = "NO";
      document.getElementById('editHandicap').value = "NO";
      document.getElementById('editArbitri').value = "NO";
      document.getElementById('editLocandina').value = "locandina_non_disponibile.png";
      document.getElementById('modalLocandina').src = "https://placehold.co";

      // Nascondiamo i testi fissi per i visitatori se siamo admin
      document.querySelectorAll('.visitor-text').forEach(el => el.style.display = 'none');
      document.getElementById('eventDialog').showModal();
    }

    // SALVATAGGIO: DETERMINA SE FARE AGGIORNAMENTO O INSERIMENTO
    function saveEventData() {
      const id = document.getElementById('editEventId').value;
      const title = document.getElementById('editTitle').value.trim();
      if (!title) { alert("Il titolo del torneo è obbligatorio!"); return; }

      const updatedEvent = {
        "id": id.startsWith("NEW_") ? Date.now() : parseInt(id, 10), // Assegna o conserva l'id univoco
        "title": title,
        "className": document.getElementById('editClassName').value,
		  "stato": document.getElementById('editStato').value,
        "sede": document.getElementById('editSede').value.trim(),
        "premio": document.getElementById('editPremio').value.trim(),
        "iscrizione": document.getElementById('editIscrizione').value.trim(),
        "entro": document.getElementById('editEntro').value,
        "start": document.getElementById('editStart').value,
        "end_date": document.getElementById('editEndDate').value,
        "specialita": document.getElementById('editSpecialita').value.trim(),
        "categorie": document.getElementById('editCategorie').value.trim(),
        "separate": document.getElementById('editSeparate').value,
        "handicap": document.getElementById('editHandicap').value,
        "arbitri": document.getElementById('editArbitri').value,
        "locandina": document.getElementById('editLocandina').value.trim(),
		  "vincitore": document.getElementById('editVincitore').value.trim()
      };

      if (id.startsWith("NEW_")) {
        // Caso Inserimento: spingiamo l'oggetto nell'array principale
        rawEvents.push(updatedEvent);
      } else {
        // Caso Modifica: cerchiamo la posizione e sostituiamo l'elemento
        const index = rawEvents.findIndex(e => e.id == id || (e.title === document.getElementById('modalTitle').innerText && e.start === updatedEvent.start));
        if (index !== -1) {
          rawEvents[index] = updatedEvent;
        } else {
          // Fallback di sicurezza basato sulla coincidenza dati originaria se l'id era assente nel JSON vecchio
          const fallbackIndex = rawEvents.findIndex(e => e.title === document.getElementById('modalTitle').innerText);
          if (fallbackIndex !== -1) rawEvents[fallbackIndex] = updatedEvent;
          else rawEvents.push(updatedEvent);
        }
      }

      // Garantiamo che ogni elemento nell'array principale abbia adesso un ID associato per il futuro
      rawEvents.forEach((e, idx) => { if (!e.id) e.id = Date.now() + idx; });

      document.getElementById('eventDialog').close();
      filterAndRenderEvents(); // Aggiorna istantaneamente l'interfaccia locale
      pushToGitHub(rawEvents); // Esegue il caricamento sul Cloud di GitHub
    }

    // ELIMINAZIONE DI UN EVENTO ESISTENTE
    function deleteCurrentEvent() {
      const id = document.getElementById('editEventId').value;
      if (id.startsWith("NEW_")) {
        document.getElementById('eventDialog').close();
        return;
      }
      
      if (!confirm("Sei sicuro di voler eliminare definitivamente questo torneo dal calendario?")) return;

      const currentTitle = document.getElementById('modalTitle').innerText;
      
      // Filtra escludendo l'elemento eliminato
      rawEvents = rawEvents.filter(e => {
        if (e.id) return e.id != id;
        return e.title !== currentTitle;
      });

      document.getElementById('eventDialog').close();
      filterAndRenderEvents(); // Sincronizza l'interfaccia grafica
      pushToGitHub(rawEvents); // Aggiorna il database online
    }

    // MODIFICA DELLA FUNZIONE DI APERTURA ESISTENTE PER ADATTARLA ALL'AMMINISTRATORE
    // Sostituisci l'inizio e i campi interni della tua vecchia openDialog con questa mappatura estesa:
    const originalOpenDialog = openDialog;
    openDialog = function(evt) {
      originalOpenDialog(evt); // Esegue la mappatura classica del tuo codice per i visitatori
      
      // Estensione Amministratore: riempie i campi di input modificabili nascosti
      document.getElementById('editEventId').value = evt.id || "";
      document.getElementById('editTitle').value = evt.title || "";
      document.getElementById('editSede').value = evt.sede || "";
      document.getElementById('editPremio').value = evt.premio || "";
      document.getElementById('editIscrizione').value = evt.iscrizione || "";
      document.getElementById('editEntro').value = evt.entro || "";
      document.getElementById('editStart').value = evt.start || "";
      document.getElementById('editEndDate').value = evt.end_date || "";
      document.getElementById('editSpecialita').value = evt.specialita || "";
      document.getElementById('editCategorie').value = evt.categorie || "";
      document.getElementById('editClassName').value = evt.className || "nbc";
      document.getElementById('editSeparate').value = evt.separate === "SI" ? "SI" : "NO";
      document.getElementById('editHandicap').value = evt.handicap === "SI" ? "SI" : "NO";
	  const arbitriValue = evt.arbitri || "NO";
	  if (["SI", "NO", "1 su 2"].includes(arbitriValue)) {
	  document.getElementById('editArbitri').value = arbitriValue;
	  } else {
	  document.getElementById('editArbitri').value = "NO";
	  }
      document.getElementById('editLocandina').value = evt.locandina || "";

      // Controlla la visualizzazione del blocco scritte in base ai poteri correnti
      if (isAdminAuthenticated) {
        document.querySelectorAll('.visitor-text').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.modal-main-side .admin-only, .modal-main-side input, .modal-main-side select').forEach(el => el.style.display = 'block');
      } else {
        document.querySelectorAll('.visitor-text').forEach(el => el.style.display = '');
      }
    };
