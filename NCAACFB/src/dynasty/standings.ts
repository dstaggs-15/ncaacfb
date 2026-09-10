import "../style.css";
import { supabase } from "../supabase";
import { getAllDynasties } from "./dynastyData";

type Dynasty = {
  id: string;
  name: string;
};

type Game = {
  id: string;
  dynasty_id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
};

type DynastyTeam = {
  id: string;
  dynasty_id: string;
  name: string;
  logo_url: string | null;
};

type OfficialTeam = {
  name: string;
  logo: string;
};

type StandingRecord = {
  team: string;
  wins: number;
  losses: number;
  logo?: string;
};

async function init() {
  const app = document.querySelector<HTMLDivElement>("#app");

  if (!app) {
    console.error("Could not find #app container.");
    return;
  }

  renderLoading(app);

  try {
    const dynasties = (await getAllDynasties()) as Dynasty[];
    const officialTeams = await loadOfficialTeams();

    if (dynasties.length === 0) {
      renderEmptyState(app, "No dynasty found.");
      return;
    }

    renderPageShell(app, dynasties);

    const dynastySelect = getRequiredElement<HTMLSelectElement>("#dynasty-select");
    const standingsArea = getRequiredElement<HTMLDivElement>("#standings-area");

    await loadDynastyStandings(dynastySelect.value, standingsArea, officialTeams);

    dynastySelect.addEventListener("change", async () => {
      await loadDynastyStandings(dynastySelect.value, standingsArea, officialTeams);
    });
  } catch (error) {
    console.error(error);
    renderEmptyState(app, "Something went wrong while loading standings.");
  }
}

async function loadDynastyStandings(
  dynastyId: string,
  standingsArea: HTMLDivElement,
  officialTeams: OfficialTeam[]
) {
  if (!dynastyId) {
    standingsArea.innerHTML = `
      <div class="standings-empty">
        Choose a dynasty to view standings.
      </div>
    `;
    return;
  }

  standingsArea.innerHTML = `
    <div class="standings-empty">
      Loading standings...
    </div>
  `;

  const [{ data: games, error: gamesError }, { data: teams, error: teamsError }] =
    await Promise.all([
      supabase
        .from("games")
        .select("id, dynasty_id, home_team, away_team, home_score, away_score")
        .eq("dynasty_id", dynastyId),

      supabase
        .from("teams")
        .select("id, dynasty_id, name, logo_url")
        .eq("dynasty_id", dynastyId),
    ]);

  if (gamesError) {
    standingsArea.innerHTML = `
      <div class="standings-empty error">
        Could not load games: ${escapeHtml(gamesError.message)}
      </div>
    `;
    return;
  }

  if (teamsError) {
    standingsArea.innerHTML = `
      <div class="standings-empty error">
        Could not load teams: ${escapeHtml(teamsError.message)}
      </div>
    `;
    return;
  }

  const standings = buildStandings({
    games: (games ?? []) as Game[],
    dynastyTeams: (teams ?? []) as DynastyTeam[],
    officialTeams,
  });

  standingsArea.innerHTML = renderStandingsTable(standings);
}

function buildStandings({
  games,
  dynastyTeams,
  officialTeams,
}: {
  games: Game[];
  dynastyTeams: DynastyTeam[];
  officialTeams: OfficialTeam[];
}): StandingRecord[] {
  const standings = new Map<string, StandingRecord>();

  for (const team of dynastyTeams) {
    standings.set(normalizeTeamName(team.name), {
      team: team.name,
      wins: 0,
      losses: 0,
      logo: team.logo_url ?? getOfficialLogoUrl(team.name, officialTeams),
    });
  }

  for (const game of games) {
    const homeTeam = game.home_team.trim();
    const awayTeam = game.away_team.trim();

    if (!homeTeam || !awayTeam) {
      continue;
    }

    ensureStandingRecord(standings, homeTeam, officialTeams);
    ensureStandingRecord(standings, awayTeam, officialTeams);

    if (game.home_score === null || game.away_score === null) {
      continue;
    }

    const homeRecord = standings.get(normalizeTeamName(homeTeam));
    const awayRecord = standings.get(normalizeTeamName(awayTeam));

    if (!homeRecord || !awayRecord) {
      continue;
    }

    if (game.home_score > game.away_score) {
      homeRecord.wins += 1;
      awayRecord.losses += 1;
    } else if (game.away_score > game.home_score) {
      awayRecord.wins += 1;
      homeRecord.losses += 1;
    }
  }

  return Array.from(standings.values()).sort(compareStandings);
}

function ensureStandingRecord(
  standings: Map<string, StandingRecord>,
  teamName: string,
  officialTeams: OfficialTeam[]
) {
  const key = normalizeTeamName(teamName);

  if (standings.has(key)) {
    return;
  }

  standings.set(key, {
    team: teamName,
    wins: 0,
    losses: 0,
    logo: getOfficialLogoUrl(teamName, officialTeams),
  });
}

function compareStandings(first: StandingRecord, second: StandingRecord) {
  const firstWinPct = getWinPercentage(first);
  const secondWinPct = getWinPercentage(second);

  if (firstWinPct !== secondWinPct) {
    return secondWinPct - firstWinPct;
  }

  if (first.wins !== second.wins) {
    return second.wins - first.wins;
  }

  return first.team.localeCompare(second.team);
}

function renderPageShell(app: HTMLDivElement, dynasties: Dynasty[]) {
  app.innerHTML = `
    <main class="standings-page">
      <nav class="standings-nav">
        <a href="/dynasty/" class="standings-back-link">← Dynasty</a>

        <div class="standings-nav-links">
          <a href="/dynasty/add/" class="standings-nav-link">+ Add Stats</a>
          <a href="/dynasty/edit/" class="standings-nav-link">Edit Stats</a>
          <a href="/home/" class="standings-nav-link">Home</a>
        </div>
      </nav>

      <header class="standings-header">
        <p class="standings-eyebrow">Dynasty Control Room</p>
        <h1>Standings</h1>
        <p>View dynasty records, win percentages, and team logos.</p>
      </header>

      <section class="standings-controls">
        <label>
          Dynasty
          <select id="dynasty-select">
            ${buildDynastyOptions(dynasties)}
          </select>
        </label>
      </section>

      <section id="standings-area" class="standings-card">
        <div class="standings-empty">Loading standings...</div>
      </section>
    </main>
  `;
}

function renderStandingsTable(standings: StandingRecord[]) {
  if (standings.length === 0) {
    return `
      <div class="standings-empty">
        No games entered yet.
      </div>
    `;
  }

  return `
    <table class="standings-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Team</th>
          <th>Record</th>
          <th>Win %</th>
        </tr>
      </thead>

      <tbody>
        ${standings
          .map((record, index) => renderStandingRow(record, index))
          .join("")}
      </tbody>
    </table>
  `;
}

function renderStandingRow(record: StandingRecord, index: number) {
  const totalGames = record.wins + record.losses;
  const winPercentage =
    totalGames > 0 ? `${(getWinPercentage(record) * 100).toFixed(1)}%` : "-";

  return `
    <tr>
      <td class="standings-rank">${index + 1}</td>

      <td>
        <div class="standings-team">
          ${
            record.logo
              ? `<img src="${escapeHtml(record.logo)}" alt="${escapeHtml(record.team)} logo" />`
              : `<span class="standings-logo-placeholder"></span>`
          }

          <span>${escapeHtml(record.team)}</span>
        </div>
      </td>

      <td class="standings-record">${record.wins}-${record.losses}</td>
      <td class="standings-win-pct">${winPercentage}</td>
    </tr>
  `;
}

function buildDynastyOptions(dynasties: Dynasty[]) {
  return dynasties
    .map((dynasty, index) => {
      const selected = index === 0 ? "selected" : "";

      return `
        <option value="${escapeHtml(dynasty.id)}" ${selected}>
          ${escapeHtml(dynasty.name)}
        </option>
      `;
    })
    .join("");
}

async function loadOfficialTeams(): Promise<OfficialTeam[]> {
  try {
    const response = await fetch("/assets/teams/teamlist.json");

    if (!response.ok) {
      throw new Error(`Team list failed to load: ${response.status}`);
    }

    return (await response.json()) as OfficialTeam[];
  } catch (error) {
    console.warn("Could not load teamlist.json:", error);
    return [];
  }
}

function getOfficialLogoUrl(teamName: string, officialTeams: OfficialTeam[]) {
  const officialTeam = officialTeams.find(
    (team) => normalizeTeamName(team.name) === normalizeTeamName(teamName)
  );

  if (!officialTeam) {
    return undefined;
  }

  return `/assets/teams/logos/${officialTeam.logo}`;
}

function getWinPercentage(record: StandingRecord) {
  const totalGames = record.wins + record.losses;

  if (totalGames === 0) {
    return 0;
  }

  return record.wins / totalGames;
}

function normalizeTeamName(value: string) {
  return value.trim().toLowerCase();
}

function getRequiredElement<T extends HTMLElement>(selector: string) {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}

function renderLoading(app: HTMLDivElement) {
  app.innerHTML = `
    <main class="standings-page">
      <div class="standings-empty">Loading standings...</div>
    </main>
  `;
}

function renderEmptyState(app: HTMLDivElement, message: string) {
  app.innerHTML = `
    <main class="standings-page">
      <div class="standings-empty">${escapeHtml(message)}</div>
    </main>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default init;