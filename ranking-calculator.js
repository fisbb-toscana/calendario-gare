let rankingConfig = null;

async function loadRankingConfig() {
  rankingConfig = await loadJson("ranking-config.json");
}

function normalizeRankingCategory(value) {
  const v = String(value || "").trim().toLowerCase();
  const map = {
    "nazionale pro": "NP", "np": "NP",
    "nazionale": "N", "n": "N",
    "master": "M", "m": "M",
    "prima": "1", "1": "1", "1°": "1",
    "seconda": "2", "2": "2", "2°": "2",
    "terza": "3", "3": "3", "3°": "3"
  };
  return map[v] || null;
}

function isFinalBoardPhase(phase) {
  const finalBoard = new Set([
    "spareggio","512simi di finale", "256simi di finale", "128simi di finale",
    "64simi di finale", "32simi di finale", "16simi di finale",
    "ottavi di finale", "quarti di finale", "semifinale", "finale"
  ]);
  return finalBoard.has(String(phase || "").trim().toLowerCase());
}

function getCumulativeBonus(bonusProfile, winCount) {
  if (!bonusProfile || !rankingConfig?.bonuses?.[bonusProfile]) return 0;
  return Number(rankingConfig.bonuses[bonusProfile][String(winCount)] || 0);
}

function calculateRankingBreakdown({ profile, bonusProfile, athleteCategory, matches }) {
  if (!rankingConfig) return { total: null, error: "Configurazione ranking non caricata", rows: [] };
  const matrix = rankingConfig.profiles?.[profile]?.matrix;
  const athlete = normalizeRankingCategory(athleteCategory);
  if (!matrix) return { total: null, error: "Profilo ranking non valido", rows: [] };
  if (!athlete || !matrix[athlete]) return { total: null, error: "Categoria atleta non prevista dal profilo", rows: [] };

  let matchTotal = 0;
  let wins = 0;
  const rows = [];

  for (const match of matches || []) {
    if (!String(match.avversario || "").trim()) continue;
    const opponent = normalizeRankingCategory(match.categoria);
    const coefficient = opponent ? matrix[athlete]?.[opponent] : null;
    if (!coefficient) {
      rows.push({ match, points: null, error: "Abbinamento categorie non previsto" });
      continue;
    }
    const [winPoints, batteryLoss, finalLoss] = coefficient;
    let points;
    if (String(match.esito).toUpperCase() === "V") {
      points = Number(winPoints);
      wins += 1;
    } else {
      points = -Number(isFinalBoardPhase(match.fase) ? finalLoss : batteryLoss);
    }
    matchTotal += points;
    rows.push({ match, points });
  }

  const bonus = getCumulativeBonus(bonusProfile, wins);
  return { total: matchTotal + bonus, matchTotal, bonus, wins, rows, error: null };
}
