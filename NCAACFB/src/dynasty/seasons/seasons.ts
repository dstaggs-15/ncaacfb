import "../../style.css";
import "./seasons.css";
import seasonsHtml from "./seasons.html?raw";

import { supabase } from "../../supabase";
import { getAllDynasties } from "../dynastyData";

type Season = {
    id: string;
    year: number;
    is_current: boolean;
};

type Game = {
    id: string;
    season_id: string;
    home_team: string;
    away_team: string;
    home_score: number | null;
    away_score: number | null;
    week: number | null;
    week_label: string | null;
    sort_order: number | null;
    game_type: string | null;
    is_rivalry: boolean;
    is_playoff: boolean;
    is_conference_championship: boolean;
};

type TeamControl = {
    season_id: string;
    team_id: string;
    profile_id: string | null;
    control_type: "user" | "cpu";
    teams?: {
        name: string;
    } | null;
    profiles?: {
        username: string | null;
        display_name: string | null;
    } | null;
};

function getDynastyIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("dynastyId");
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function init() {
    const app = document.querySelector<HTMLDivElement>("#app")!;

    app.innerHTML = seasonsHtml;

    const dynastyNameEl =
        document.querySelector<HTMLHeadingElement>("#dynasty-name")!;

    const seasonHistoryContent =
        document.querySelector<HTMLElement>("#season-history-content")!;

    const dynasties = await getAllDynasties();

    const dynastyId = getDynastyIdFromUrl();

    if (!dynastyId) {
        seasonHistoryContent.innerHTML = `
            <p class="season-history-empty">
                No dynasty selected.
            </p>
        `;
        return;
    }

    const activeDynasty = dynasties.find(
        (dynasty: any) => dynasty.id === dynastyId
    );

    if (!activeDynasty) {
        seasonHistoryContent.innerHTML = `
            <p class="season-history-empty">
                Dynasty not found.
            </p>
        `;
        return;
    }

    dynastyNameEl.textContent = activeDynasty.name;

    // Get seasons
    const { data: seasons, error: seasonsError } = await supabase
        .from("seasons")
        .select("*")
        .eq("dynasty_id", activeDynasty.id)
        .order("year", { ascending: false });

    if (seasonsError) {
        console.error("Error loading seasons:", seasonsError);

        seasonHistoryContent.innerHTML = `
            <p class="season-history-empty">
                Could not load seasons.
            </p>
        `;
        return;
    }

    // Get games
    const { data: games, error: gamesError } = await supabase
        .from("games")
        .select("*")
        .eq("dynasty_id", activeDynasty.id);

    if (gamesError) {
        console.error("Error loading games:", gamesError);

        seasonHistoryContent.innerHTML = `
            <p class="season-history-empty">
                Could not load games.
            </p>
        `;
        return;
    }

    // Get who controls each team for each season
    const { data: teamControls, error: controlsError } = await supabase
        .from("season_team_control")
        .select(`
            season_id,
            team_id,
            profile_id,
            control_type,
            teams:team_id (
                name
            ),
            profiles:profile_id (
                username,
                display_name
            )
        `);

    if (controlsError) {
        console.error("Error loading team controls:", controlsError);
    }

    const controls = (teamControls ?? []) as TeamControl[];

    // Get team logos
    const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .eq("dynasty_id", activeDynasty.id);

    if (teamsError) {
        console.error("Error loading teams:", teamsError);
    }

    const teamLogoMap: Record<string, string> = {};

    if (teams) {
        teams.forEach((team: any) => {
            if (team.logo_url) {
                teamLogoMap[team.name.toLowerCase()] = team.logo_url;
            }
        });
    }

    function teamNameToSlug(name: string): string {
        return name.toLowerCase().replace(/\s+/g, "-");
    }

    function getLogoHtml(teamName: string) {
        const src =
            teamLogoMap[teamName.toLowerCase()] ||
            `/assets/teams/logos/${teamNameToSlug(teamName)}.png`;

        return `
            <img
                src="${src}"
                alt="${escapeHtml(teamName)} logo"
                class="team-logo"
                onerror="this.style.display='none'"
            />
        `;
    }

    function getGameType(game: Game): string {
        if (game.game_type) {
            return game.game_type;
        }

        if (game.is_conference_championship) {
            return "conference_championship";
        }

        if (game.is_playoff) {
            return "playoff";
        }

        if (game.is_rivalry) {
            return "rivalry";
        }

        return "regular";
    }

    function getGameTypeLabel(game: Game): string {
        const type = getGameType(game);

        if (type === "conference_championship") {
            return "🏆 Conference Championship";
        }

        if (type === "national_championship") {
            return "🏆 National Championship";
        }

        if (type === "bowl") {
            return "🏆 Bowl Game";
        }

        if (type === "playoff") {
            return "🏆 Playoff";
        }

        if (type === "rivalry") {
            return "⚔️ Rivalry";
        }

        return "";
    }

    function getWeekLabel(game: Game): string {
        if (game.week_label) {
            return game.week_label;
        }

        if (game.week !== null && game.week !== undefined) {
            return `Week ${game.week}`;
        }

        const type = getGameType(game);

        if (type === "conference_championship") {
            return "Conference Championship";
        }

        if (type === "national_championship") {
            return "National Championship";
        }

        if (type === "bowl") {
            return "Bowl Game";
        }

        if (type === "playoff") {
            return "Playoff";
        }

        return "Post-Season";
    }

    function getGameSortValue(game: Game): number {
        if (game.sort_order !== null && game.sort_order !== undefined) {
            return game.sort_order;
        }

        if (game.week !== null && game.week !== undefined) {
            return game.week;
        }

        const type = getGameType(game);

        if (type === "conference_championship") {
            return 14;
        }

        if (type === "playoff") {
            return 15;
        }

        if (type === "bowl") {
            return 16;
        }

        if (type === "national_championship") {
            return 99;
        }

        return 100;
    }

    function getControlForTeam(
        seasonId: string,
        teamName: string
    ): TeamControl | null {
        return (
            controls.find(
                (control) =>
                    control.season_id === seasonId &&
                    control.teams?.name?.toLowerCase() ===
                        teamName.toLowerCase()
            ) ?? null
        );
    }

    function getGameMatchupType(
        seasonId: string,
        game: Game
    ): "user-user" | "user-cpu" | "cpu-cpu" {
        const homeControl = getControlForTeam(seasonId, game.home_team);
        const awayControl = getControlForTeam(seasonId, game.away_team);

        const homeIsUser = homeControl?.control_type === "user";
        const awayIsUser = awayControl?.control_type === "user";

        if (homeIsUser && awayIsUser) {
            return "user-user";
        }

        if (homeIsUser || awayIsUser) {
            return "user-cpu";
        }

        return "cpu-cpu";
    }

    function getMatchupLabel(
        seasonId: string,
        game: Game
    ): string {
        const matchupType = getGameMatchupType(seasonId, game);

        if (matchupType === "user-user") {
            return `<span class="game-matchup-user-user">USER VS USER</span>`;
        }

        if (matchupType === "user-cpu") {
            return `<span class="game-matchup-user-cpu">USER VS CPU</span>`;
        }

        return "";
    }

    function getUserName(control: TeamControl): string {
        return (
            control.profiles?.display_name ||
            control.profiles?.username ||
            "User"
        );
    }

    function getUserControlledTeams(
        seasonId: string
    ): TeamControl[] {
        return controls
            .filter(
                (control) =>
                    control.season_id === seasonId &&
                    control.control_type === "user"
            )
            .sort((a, b) => {
                const aName = getUserName(a).toLowerCase();
                const bName = getUserName(b).toLowerCase();

                return aName.localeCompare(bName);
            });
    }

    function renderGameRow(
        seasonId: string,
        game: Game
    ): string {
        return `
            <tr>
                <td>${escapeHtml(getWeekLabel(game))}</td>

                <td>
                    ${getLogoHtml(game.home_team)}
                    ${escapeHtml(game.home_team)}
                </td>

                <td class="season-history-score">
                    ${game.home_score ?? "-"} - ${game.away_score ?? "-"}
                </td>

                <td>
                    ${getLogoHtml(game.away_team)}
                    ${escapeHtml(game.away_team)}
                </td>

                <td class="season-history-type">
                    ${getGameTypeLabel(game)}
                    ${getMatchupLabel(seasonId, game)}
                </td>
            </tr>
        `;
    }

    function renderUserSection(
        season: Season,
        control: TeamControl,
        seasonGames: Game[]
    ): string {
        const teamName = control.teams?.name ?? "Unknown Team";
        const userName = getUserName(control);

        const teamGames = seasonGames
            .filter(
                (game) =>
                    game.home_team.toLowerCase() ===
                        teamName.toLowerCase() ||
                    game.away_team.toLowerCase() ===
                        teamName.toLowerCase()
            )
            .sort(
                (a, b) =>
                    getGameSortValue(a) -
                    getGameSortValue(b)
            );

        if (teamGames.length === 0) {
            return "";
        }

        return `
            <div class="season-user-section">

                <div class="season-user-heading">
                    <h3>
                        ${escapeHtml(userName)} — ${escapeHtml(teamName)}
                    </h3>
                </div>

                <table class="season-history-table">
                    <thead>
                        <tr>
                            <th>Week</th>
                            <th>Home</th>
                            <th>Score</th>
                            <th>Away</th>
                            <th>Type</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${teamGames
                            .map((game) =>
                                renderGameRow(season.id, game)
                            )
                            .join("")}
                    </tbody>
                </table>

            </div>
        `;
    }

    function renderOtherGames(
        season: Season,
        seasonGames: Game[]
    ): string {
        const otherGames = seasonGames
            .filter(
                (game) =>
                    getGameMatchupType(season.id, game) === "cpu-cpu"
            )
            .sort(
                (a, b) =>
                    getGameSortValue(a) -
                    getGameSortValue(b)
            );

        if (otherGames.length === 0) {
            return "";
        }

        return `
            <div class="season-user-section">

                <div class="season-user-heading">
                    <h3>Other Games</h3>
                </div>

                <table class="season-history-table">
                    <thead>
                        <tr>
                            <th>Week</th>
                            <th>Home</th>
                            <th>Score</th>
                            <th>Away</th>
                            <th>Type</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${otherGames
                            .map((game) =>
                                renderGameRow(season.id, game)
                            )
                            .join("")}
                    </tbody>
                </table>

            </div>
        `;
    }

    function renderSeason(
        season: Season
    ): string {
        const seasonGames =
            (games as Game[] | null)?.filter(
                (game) => game.season_id === season.id
            ) ?? [];

        const userTeams =
            getUserControlledTeams(season.id);

        const userSections = userTeams
            .map((control) =>
                renderUserSection(
                    season,
                    control,
                    seasonGames
                )
            )
            .join("");

        const otherGames = renderOtherGames(
            season,
            seasonGames
        );

        if (
            seasonGames.length === 0
        ) {
            return `
                <section class="season-history-season">
                    <div class="season-history-season-heading">
                        <h2>${season.year} Season</h2>

                        ${
                            season.is_current
                                ? `<span class="current-season-pill">Current</span>`
                                : ""
                        }
                    </div>

                    <p class="season-history-empty">
                        No games entered yet.
                    </p>
                </section>
            `;
        }

        return `
            <section class="season-history-season">

                <div class="season-history-season-heading">
                    <h2>${season.year} Season</h2>

                    ${
                        season.is_current
                            ? `<span class="current-season-pill">Current</span>`
                            : ""
                    }
                </div>

                ${userSections}

                ${otherGames}

            </section>
        `;
    }

    function renderSeasons() {
        if (!seasons || seasons.length === 0) {
            seasonHistoryContent.innerHTML = `
                <p class="season-history-empty">
                    No seasons added yet.
                </p>
            `;
            return;
        }

        seasonHistoryContent.innerHTML = seasons
            .map((season: any) =>
                renderSeason(season as Season)
            )
            .join("");
    }

    renderSeasons();
}

export default init;
