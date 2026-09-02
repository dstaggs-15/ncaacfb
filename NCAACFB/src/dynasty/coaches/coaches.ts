import "../../style.css";
import "./coaches.css";
import coachesHtml from "./coaches.html?raw";

import { supabase } from "../../supabase";
import { getAllDynasties } from "../dynastyData";

type Dynasty = {
  id: string;
  name: string;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
};

type Season = {
  id: string;
  dynasty_id: string;
  year: number;
};

type Team = {
  id: string;
  dynasty_id: string;
  name: string;
};

type SeasonTeamControl = {
  season_id: string;
  team_id: string;
  profile_id: string | null;
  control_type: "user" | "cpu";
};

type Game = {
  id: string;
  season_id: string;
  dynasty_id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  week: number | null;
  game_type: string | null;
  week_label: string | null;
  sort_order: number | null;
};

type CoachSeason = {
  seasonYear: number;
  team: string;
  wins: number;
  losses: number;
  conferenceWins: number;
  conferenceLosses: number;
};

type CoachRecord = {
  profileId: string;
  coachName: string;
  seasons: CoachSeason[];
  wins: number;
  losses: number;
  conferenceWins: number;
  conferenceLosses: number;
};

type H2HRecord = {
  opponentProfileId: string;
  opponentName: string;
  wins: number;
  losses: number;
};

let currentCoaches: CoachRecord[] = [];
let selectedCoachIds = new Set<string>();

async function init() {
  const app = document.querySelector<HTMLDivElement>("#app")!;

  app.innerHTML = coachesHtml;

  const dynastySelect =
    document.querySelector<HTMLSelectElement>("#dynasty-select");

  const coachListBody =
    document.querySelector<HTMLTableSectionElement>("#coach-list-body");

  const recordsTableBody =
    document.querySelector<HTMLTableSectionElement>("#coaches-table-body");

  const selectedCoachSummary =
    document.querySelector<HTMLParagraphElement>("#selected-coach-summary");

  if (
    !dynastySelect ||
    !coachListBody ||
    !recordsTableBody ||
    !selectedCoachSummary
  ) {
    console.error("Coaches page elements were not found.");
    return;
  }

  const dynasties = (await getAllDynasties()) as Dynasty[];

  renderDynastyOptions(dynastySelect, dynasties);

  dynastySelect.addEventListener("change", async () => {
    const dynastyId = dynastySelect.value;

    selectedCoachIds.clear();
    currentCoaches = [];

    renderNoSelectedCoaches(recordsTableBody, selectedCoachSummary);

    if (!dynastyId) {
      renderCoachIdle(coachListBody);
      return;
    }

    await loadCoachesForDynasty(
      dynastyId,
      coachListBody
    );
  });

  coachListBody.addEventListener("click", (event) => {
    const row = (event.target as HTMLElement).closest<HTMLTableRowElement>(
      "[data-coach-id]"
    );

    if (!row) return;

    const coachId = row.dataset.coachId;

    if (!coachId) return;

    if (selectedCoachIds.has(coachId)) {
      selectedCoachIds.delete(coachId);
    } else {
      selectedCoachIds.add(coachId);
    }

    renderCoachList(
      coachListBody,
      currentCoaches,
      selectedCoachIds
    );

    renderSelectedCoaches(
      recordsTableBody,
      selectedCoachSummary
    );
  });
}

function renderDynastyOptions(
  dynastySelect: HTMLSelectElement,
  dynasties: Dynasty[]
) {
  const optionsHtml = dynasties
    .map((dynasty) => {
      return `<option value="${dynasty.id}">${escapeHtml(
        dynasty.name
      )}</option>`;
    })
    .join("");

  dynastySelect.innerHTML = `
    <option value="">Choose a dynasty</option>
    ${optionsHtml}
  `;
}

async function loadCoachesForDynasty(
  dynastyId: string,
  coachListBody: HTMLTableSectionElement
) {
  coachListBody.innerHTML = `
    <tr>
      <td colspan="2" class="coaches-empty-row">
        Loading coaches...
      </td>
    </tr>
  `;

  try {
    /*
     * Load all of the pieces needed to calculate coach records:
     *
     * seasons
     * teams
     * profiles
     * season_team_control
     * games
     *
     * We intentionally do NOT rely on the old coaches table for
     * wins/losses because users can change teams between seasons.
     */

    const [
      seasonsResult,
      teamsResult,
      profilesResult,
      controlResult,
      gamesResult,
    ] = await Promise.all([
      supabase
        .from("seasons")
        .select("id, dynasty_id, year")
        .eq("dynasty_id", dynastyId)
        .order("year", { ascending: true }),

      supabase
        .from("teams")
        .select("id, dynasty_id, name")
        .eq("dynasty_id", dynastyId),

      supabase
        .from("profiles")
        .select("id, username, display_name"),

      supabase
        .from("season_team_control")
        .select("season_id, team_id, profile_id, control_type"),

      supabase
        .from("games")
        .select(`
          id,
          season_id,
          dynasty_id,
          home_team,
          away_team,
          home_score,
          away_score,
          week,
          game_type,
          week_label,
          sort_order
        `)
        .eq("dynasty_id", dynastyId),
    ]);

    if (seasonsResult.error) {
      throw seasonsResult.error;
    }

    if (teamsResult.error) {
      throw teamsResult.error;
    }

    if (profilesResult.error) {
      throw profilesResult.error;
    }

    if (controlResult.error) {
      throw controlResult.error;
    }

    if (gamesResult.error) {
      throw gamesResult.error;
    }

    const seasons = (seasonsResult.data ?? []) as Season[];
    const teams = (teamsResult.data ?? []) as Team[];
    const profiles = (profilesResult.data ?? []) as Profile[];
    const controls = (controlResult.data ?? []) as SeasonTeamControl[];
    const games = (gamesResult.data ?? []) as Game[];

    currentCoaches = calculateCoachRecords(
      seasons,
      teams,
      profiles,
      controls,
      games
    );

    renderCoachList(
      coachListBody,
      currentCoaches,
      selectedCoachIds
    );
  } catch (error) {
    console.error("Error loading coaches:", error);

    coachListBody.innerHTML = `
      <tr>
        <td colspan="2" class="coaches-empty-row coaches-error">
          Could not load coaches.
        </td>
      </tr>
    `;
  }
}

function calculateCoachRecords(
  seasons: Season[],
  teams: Team[],
  profiles: Profile[],
  controls: SeasonTeamControl[],
  games: Game[]
): CoachRecord[] {
  const profileMap = new Map<string, Profile>();
  const teamMap = new Map<string, Team>();
  const seasonMap = new Map<string, Season>();

  for (const profile of profiles) {
    profileMap.set(profile.id, profile);
  }

  for (const team of teams) {
    teamMap.set(team.id, team);
  }

  for (const season of seasons) {
    seasonMap.set(season.id, season);
  }

  /*
   * Maps:
   *
   * season ID + team ID -> human profile
   *
   * This is what allows:
   *
   * 2026 Daniel = California
   * 2027 Daniel = Vanderbilt
   * 2028 Daniel = Texas
   *
   * without permanently assigning Daniel to one team.
   */
  const controlMap = new Map<string, string>();

  for (const control of controls) {
    if (
      control.control_type !== "user" ||
      !control.profile_id
    ) {
      continue;
    }

    const key = makeSeasonTeamKey(
      control.season_id,
      control.team_id
    );

    controlMap.set(key, control.profile_id);
  }

  const coachMap = new Map<string, CoachRecord>();

  /*
   * Process every game and determine which human coach,
   * if any, controlled each side.
   */
  for (const game of games) {
    if (
      game.home_score === null ||
      game.away_score === null
    ) {
      continue;
    }

    const season = seasonMap.get(game.season_id);

    if (!season) {
      continue;
    }

    const homeTeam = findTeamByName(
      teams,
      game.home_team
    );

    const awayTeam = findTeamByName(
      teams,
      game.away_team
    );

    if (!homeTeam || !awayTeam) {
      continue;
    }

    const homeProfileId = controlMap.get(
      makeSeasonTeamKey(
        game.season_id,
        homeTeam.id
      )
    );

    const awayProfileId = controlMap.get(
      makeSeasonTeamKey(
        game.season_id,
        awayTeam.id
      )
    );

    /*
     * If neither side is controlled by a human,
     * this game doesn't affect coach records.
     */
    if (!homeProfileId && !awayProfileId) {
      continue;
    }

    /*
     * User vs User
     */
    if (homeProfileId && awayProfileId) {
      const homeWon =
        game.home_score > game.away_score;

      const awayWon =
        game.away_score > game.home_score;

      updateCoachGame(
        coachMap,
        homeProfileId,
        season.year,
        homeTeam.name,
        homeWon,
        isConferenceGame(game),
        awayProfileId,
        profileMap
      );

      updateCoachGame(
        coachMap,
        awayProfileId,
        season.year,
        awayTeam.name,
        awayWon,
        isConferenceGame(game),
        homeProfileId,
        profileMap
      );

      continue;
    }

    /*
     * User vs CPU
     */
    if (homeProfileId) {
      updateCoachGame(
        coachMap,
        homeProfileId,
        season.year,
        homeTeam.name,
        game.home_score > game.away_score,
        isConferenceGame(game),
        null,
        profileMap
      );
    }

    if (awayProfileId) {
      updateCoachGame(
        coachMap,
        awayProfileId,
        season.year,
        awayTeam.name,
        game.away_score > game.home_score,
        isConferenceGame(game),
        null,
        profileMap
      );
    }
  }

  return Array.from(coachMap.values()).sort((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }

    if (a.losses !== b.losses) {
      return a.losses - b.losses;
    }

    return a.coachName.localeCompare(b.coachName);
  });
}

function updateCoachGame(
  coachMap: Map<string, CoachRecord>,
  profileId: string,
  seasonYear: number,
  teamName: string,
  won: boolean,
  conferenceGame: boolean,
  opponentProfileId: string | null,
  profileMap: Map<string, Profile>
) {
  const profile = profileMap.get(profileId);

  const coachName =
    profile?.display_name ||
    profile?.username ||
    "Unknown";

  let coach = coachMap.get(profileId);

  if (!coach) {
    coach = {
      profileId,
      coachName,
      seasons: [],
      wins: 0,
      losses: 0,
      conferenceWins: 0,
      conferenceLosses: 0,
    };

    coachMap.set(profileId, coach);
  }

  if (won) {
    coach.wins++;

    if (conferenceGame) {
      coach.conferenceWins++;
    }
  } else {
    coach.losses++;

    if (conferenceGame) {
      coach.conferenceLosses++;
    }
  }

  let seasonRecord = coach.seasons.find(
    (season) =>
      season.seasonYear === seasonYear &&
      season.team === teamName
  );

  if (!seasonRecord) {
    seasonRecord = {
      seasonYear,
      team: teamName,
      wins: 0,
      losses: 0,
      conferenceWins: 0,
      conferenceLosses: 0,
    };

    coach.seasons.push(seasonRecord);
  }

  if (won) {
    seasonRecord.wins++;

    if (conferenceGame) {
      seasonRecord.conferenceWins++;
    }
  } else {
    seasonRecord.losses++;

    if (conferenceGame) {
      seasonRecord.conferenceLosses++;
    }
  }
}

function renderCoachIdle(
  coachListBody: HTMLTableSectionElement
) {
  coachListBody.innerHTML = `
    <tr>
      <td colspan="2" class="coaches-empty-row">
        Choose a dynasty to see the coaches.
      </td>
    </tr>
  `;
}

function renderCoachList(
  coachListBody: HTMLTableSectionElement,
  coaches: CoachRecord[],
  activeCoachIds: Set<string>
) {
  if (coaches.length === 0) {
    coachListBody.innerHTML = `
      <tr>
        <td colspan="2" class="coaches-empty-row">
          No coaches found in this dynasty yet.
        </td>
      </tr>
    `;

    return;
  }

  coachListBody.innerHTML = coaches
    .map((coach) => {
      const isActive = activeCoachIds.has(
        coach.profileId
      );

      const teams = coach.seasons
        .map(
          (season) =>
            `${season.seasonYear}: ${season.team}`
        )
        .join("<br>");

      return `
        <tr
          class="coaches-selectable-row ${
            isActive ? "is-selected" : ""
          }"
          data-coach-id="${escapeHtml(
            coach.profileId
          )}"
        >
          <td class="coaches-name">
            ${escapeHtml(coach.coachName)}
          </td>

          <td class="coaches-team">
            ${teams}
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderNoSelectedCoaches(
  recordsTableBody: HTMLTableSectionElement,
  selectedCoachSummary: HTMLParagraphElement
) {
  selectedCoachSummary.textContent =
    "Choose one or more coaches to view their records.";

  recordsTableBody.innerHTML = `
    <tr>
      <td colspan="4" class="coaches-empty-row">
        No coaches selected.
      </td>
    </tr>
  `;
}

function renderSelectedCoaches(
  recordsTableBody: HTMLTableSectionElement,
  selectedCoachSummary: HTMLParagraphElement
) {
  const selectedCoaches = currentCoaches.filter(
    (coach) =>
      selectedCoachIds.has(coach.profileId)
  );

  if (selectedCoaches.length === 0) {
    renderNoSelectedCoaches(
      recordsTableBody,
      selectedCoachSummary
    );

    return;
  }

  selectedCoachSummary.textContent =
    selectedCoaches.length === 1
      ? "1 coach selected."
      : `${selectedCoaches.length} coaches selected.`;

  recordsTableBody.innerHTML = selectedCoaches
    .map((coach) => {
      const seasonRows = coach.seasons
        .sort(
          (a, b) =>
            a.seasonYear - b.seasonYear
        )
        .map(
          (season) => `
            <tr>
              <td class="coaches-name">
                ${escapeHtml(coach.coachName)}
              </td>

              <td class="coaches-team">
                ${escapeHtml(season.team)}
                <br>
                <small>${season.seasonYear}</small>
              </td>

              <td class="coaches-record">
                ${season.wins}-${season.losses}
              </td>

              <td class="coaches-conference-record">
                ${season.conferenceWins}-${season.conferenceLosses}
              </td>
            </tr>
          `
        )
        .join("");

      return seasonRows;
    })
    .join("");
}

function findTeamByName(
  teams: Team[],
  name: string
): Team | null {
  const normalizedName = normalizeTeamName(name);

  return (
    teams.find(
      (team) =>
        normalizeTeamName(team.name) ===
        normalizedName
    ) ?? null
  );
}

function normalizeTeamName(
  name: string
): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function makeSeasonTeamKey(
  seasonId: string,
  teamId: string
): string {
  return `${seasonId}:${teamId}`;
}

function isConferenceGame(
  game: Game
): boolean {
  const type =
    (game.game_type ?? "").trim().toLowerCase();

  /*
   * Conference championship is a conference game.
   *
   * Regular-season games are assumed to be
   * conference games only when the importer explicitly
   * marks them as such in the future.
   *
   * For now, this correctly recognizes the explicit
   * Conference Championship game type.
   */
  return (
    type === "conference_championship" ||
    type === "conference championship"
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default init;
