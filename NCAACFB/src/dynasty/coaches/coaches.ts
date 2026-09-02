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

type H2HRecord = {
  opponentProfileId: string;
  opponentName: string;
  wins: number;
  losses: number;
};

type CoachRecord = {
  profileId: string;
  coachName: string;

  seasons: CoachSeason[];

  wins: number;
  losses: number;

  conferenceWins: number;
  conferenceLosses: number;

  h2h: H2HRecord[];
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

  /*
   * The existing HTML does not need to be changed.
   *
   * We create the H2H section dynamically underneath
   * the existing records table.
   */
  const h2hContainer = createH2HContainer(recordsTableBody);

  const dynasties = (await getAllDynasties()) as Dynasty[];

  renderDynastyOptions(dynastySelect, dynasties);

  dynastySelect.addEventListener("change", async () => {
    const dynastyId = dynastySelect.value;

    selectedCoachIds.clear();
    currentCoaches = [];

    renderNoSelectedCoaches(
      recordsTableBody,
      selectedCoachSummary,
      h2hContainer
    );

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
      selectedCoachSummary,
      h2hContainer
    );
  });
}

function renderDynastyOptions(
  dynastySelect: HTMLSelectElement,
  dynasties: Dynasty[]
) {
  const optionsHtml = dynasties
    .map((dynasty) => {
      return `<option value="${escapeHtml(dynasty.id)}">${escapeHtml(
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
     * We intentionally do NOT rely on the old coaches table.
     *
     * Users can change teams between seasons, so the
     * season_team_control table is the source of truth.
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
        .select(
          "season_id, team_id, profile_id, control_type"
        ),

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
    const controls =
      (controlResult.data ?? []) as SeasonTeamControl[];
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
  const seasonMap = new Map<string, Season>();

  for (const profile of profiles) {
    profileMap.set(profile.id, profile);
  }

  for (const season of seasons) {
    seasonMap.set(season.id, season);
  }

  /*
   * season ID + team ID -> human profile
   *
   * Example:
   *
   * 2026 California -> Daniel
   * 2027 Vanderbilt -> Daniel
   * 2028 Texas -> Daniel
   *
   * This lets coaches change teams between seasons.
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
   * Process every game.
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
     * CPU vs CPU:
     * Nothing to record.
     */
    if (!homeProfileId && !awayProfileId) {
      continue;
    }

    const conferenceGame = isConferenceGame(game);

    /*
     * USER VS USER
     *
     * This is also what creates the H2H records.
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
        conferenceGame,
        awayProfileId,
        profileMap
      );

      updateCoachGame(
        coachMap,
        awayProfileId,
        season.year,
        awayTeam.name,
        awayWon,
        conferenceGame,
        homeProfileId,
        profileMap
      );

      continue;
    }

    /*
     * USER VS CPU
     */
    if (homeProfileId) {
      updateCoachGame(
        coachMap,
        homeProfileId,
        season.year,
        homeTeam.name,
        game.home_score > game.away_score,
        conferenceGame,
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
        conferenceGame,
        null,
        profileMap
      );
    }
  }

  /*
   * Sort each coach's seasons chronologically.
   */
  for (const coach of coachMap.values()) {
    coach.seasons.sort(
      (a, b) => a.seasonYear - b.seasonYear
    );

    coach.h2h.sort((a, b) =>
      a.opponentName.localeCompare(b.opponentName)
    );
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
      h2h: [],
    };

    coachMap.set(profileId, coach);
  }

  /*
   * Overall all-time record.
   */
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

  /*
   * Season record.
   */
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

  /*
   * Head-to-head record.
   *
   * Only created when both sides are human-controlled.
   */
  if (opponentProfileId) {
    const opponentProfile =
      profileMap.get(opponentProfileId);

    const opponentName =
      opponentProfile?.display_name ||
      opponentProfile?.username ||
      "Unknown";

    let h2h = coach.h2h.find(
      (record) =>
        record.opponentProfileId ===
        opponentProfileId
    );

    if (!h2h) {
      h2h = {
        opponentProfileId,
        opponentName,
        wins: 0,
        losses: 0,
      };

      coach.h2h.push(h2h);
    }

    if (won) {
      h2h.wins++;
    } else {
      h2h.losses++;
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
  selectedCoachSummary: HTMLParagraphElement,
  h2hContainer: HTMLDivElement
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

  h2hContainer.innerHTML = "";
}

function renderSelectedCoaches(
  recordsTableBody: HTMLTableSectionElement,
  selectedCoachSummary: HTMLParagraphElement,
  h2hContainer: HTMLDivElement
) {
  const selectedCoaches = currentCoaches.filter(
    (coach) =>
      selectedCoachIds.has(coach.profileId)
  );

  if (selectedCoaches.length === 0) {
    renderNoSelectedCoaches(
      recordsTableBody,
      selectedCoachSummary,
      h2hContainer
    );

    return;
  }

  selectedCoachSummary.textContent =
    selectedCoaches.length === 1
      ? "1 coach selected."
      : `${selectedCoaches.length} coaches selected.`;

  /*
   * ALL-TIME ROW
   *
   * This appears before the individual seasons.
   */
  recordsTableBody.innerHTML = selectedCoaches
    .map((coach) => {
      const allTimeRow = `
        <tr class="coaches-all-time-row">
          <td class="coaches-name">
            ${escapeHtml(coach.coachName)}
          </td>

          <td class="coaches-team">
            <strong>ALL-TIME</strong>
          </td>

          <td class="coaches-record">
            <strong>${coach.wins}-${coach.losses}</strong>
          </td>

          <td class="coaches-conference-record">
            <strong>
              ${coach.conferenceWins}-${coach.conferenceLosses}
            </strong>
          </td>
        </tr>
      `;

      const seasonRows = coach.seasons
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

      return allTimeRow + seasonRows;
    })
    .join("");

  renderH2H(
    h2hContainer,
    selectedCoaches
  );
}

function createH2HContainer(
  recordsTableBody: HTMLTableSectionElement
): HTMLDivElement {
  const existing =
    document.querySelector<HTMLDivElement>(
      "#coaches-h2h-container"
    );

  if (existing) {
    return existing;
  }

  const container =
    document.createElement("div");

  container.id = "coaches-h2h-container";
  container.className = "coaches-h2h-container";

  const table = recordsTableBody.closest("table");

  if (table) {
    table.insertAdjacentElement(
      "afterend",
      container
    );
  } else {
    recordsTableBody.parentElement?.appendChild(
      container
    );
  }

  return container;
}

function renderH2H(
  container: HTMLDivElement,
  selectedCoaches: CoachRecord[]
) {
  /*
   * H2H requires at least two selected coaches.
   */
  if (selectedCoaches.length < 2) {
    container.innerHTML = `
      <div class="coaches-h2h">
        <h3>Head-to-Head</h3>

        <p class="coaches-empty-row">
          Select at least two coaches to view all-time head-to-head records.
        </p>
      </div>
    `;

    return;
  }

  /*
   * Build every unique pairing.
   *
   * If we select:
   *
   * Tucker
   * Daniel
   * Cam
   *
   * we get:
   *
   * Tucker vs Daniel
   * Tucker vs Cam
   * Daniel vs Cam
   *
   * We only display each matchup once.
   */
  const pairings: Array<{
    coach: CoachRecord;
    opponent: CoachRecord;
    wins: number;
    losses: number;
  }> = [];

  for (
    let i = 0;
    i < selectedCoaches.length;
    i++
  ) {
    for (
      let j = i + 1;
      j < selectedCoaches.length;
      j++
    ) {
      const coach = selectedCoaches[i];
      const opponent = selectedCoaches[j];

      const record = coach.h2h.find(
        (h2h) =>
          h2h.opponentProfileId ===
          opponent.profileId
      );

      pairings.push({
        coach,
        opponent,
        wins: record?.wins ?? 0,
        losses: record?.losses ?? 0,
      });
    }
  }

  container.innerHTML = `
    <div class="coaches-h2h">
      <h3>Head-to-Head — All-Time</h3>

      ${
        pairings.length === 0
          ? `
            <p class="coaches-empty-row">
              No head-to-head games have been played between the selected coaches.
            </p>
          `
          : `
            <div class="coaches-h2h-table-wrapper">
              <table class="coaches-h2h-table">
                <thead>
                  <tr>
                    <th>Coach</th>
                    <th>Opponent</th>
                    <th>Record</th>
                  </tr>
                </thead>

                <tbody>
                  ${pairings
                    .map(
                      (pairing) => `
                        <tr>
                          <td class="coaches-name">
                            ${escapeHtml(
                              pairing.coach.coachName
                            )}
                          </td>

                          <td class="coaches-team">
                            ${escapeHtml(
                              pairing.opponent.coachName
                            )}
                          </td>

                          <td class="coaches-record">
                            ${pairing.wins}-${pairing.losses}
                          </td>
                        </tr>
                      `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `
      }
    </div>
  `;
}

function findTeamByName(
  teams: Team[],
  name: string
): Team | null {
  const normalizedName =
    normalizeTeamName(name);

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
    (game.game_type ?? "")
      .trim()
      .toLowerCase();

  /*
   * Conference Championship counts as a
   * conference game.
   *
   * Regular-season conference games are not
   * currently distinguishable from non-conference
   * games because the games table does not have a
   * conference-game flag.
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
