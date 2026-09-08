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
        return name
            .toLowerCase()
            .replace(/\s+/g, "-");
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

    /*
     * Normalize game type into one consistent format.
     *
     * This handles:
     *
     * "Bowl"
     * "Bowl Game"
     * "bowl"
     * "BOWL"
     * "National Championship"
     * "national_championship"
     * etc.
     */
    function normalizeGameType(value: string | null): string {
        return (value ?? "")
            .trim()
            .toLowerCase()
            .replace(/[_-]+/g, " ")
            .replace(/\s+/g, " ");
    }

    /*
     * Normalize week labels too.
     *
     * Examples:
     *
     * "Conf Champ"
     * "Conference Championship"
     * "Bowl 2"
     * "Nat'l Champ"
     * "National Championship"
     */
    function normalizeWeekLabel(value: string | null): string {
        return (value ?? "")
            .trim()
            .toLowerCase()
            .replace(/[’']/g, "'")
            .replace(/[_-]+/g, " ")
            .replace(/\s+/g, " ");
    }

    function getGameType(game: Game): string {
        const explicitType = normalizeGameType(
            game.game_type
        );

        if (explicitType) {
            return explicitType;
        }

        if (game.is_conference_championship) {
            return "conference championship";
        }

        if (game.is_playoff) {
            return "playoff";
        }

        if (game.is_rivalry) {
            return "rivalry";
        }

        /*
         * Older/imported games may not have game_type
         * populated, so try week_label as a fallback.
         */
        const weekLabel = normalizeWeekLabel(
            game.week_label
        );

        if (
            weekLabel === "conf champ" ||
            weekLabel === "conference championship"
        ) {
            return "conference championship";
        }

        if (
            weekLabel === "nat'l champ" ||
            weekLabel === "national championship"
        ) {
            return "national championship";
        }

        if (weekLabel.startsWith("bowl")) {
            return "bowl";
        }

        if (weekLabel.startsWith("playoff")) {
            return "playoff";
        }

        return "regular season";
    }

    /*
     * Determines whether a game is a Conference Championship.
     */
    function isConferenceChampionship(
        game: Game
    ): boolean {
        if (game.is_conference_championship) {
            return true;
        }

        const type = normalizeGameType(
            game.game_type
        );

        if (
            type === "conference championship"
        ) {
            return true;
        }

        const label = normalizeWeekLabel(
            game.week_label
        );

        return (
            label === "conf champ" ||
            label === "conference championship"
        );
    }

    /*
     * Determines whether a game is a National Championship.
     */
    function isNationalChampionship(
        game: Game
    ): boolean {
        const type = normalizeGameType(
            game.game_type
        );

        if (
            type === "national championship"
        ) {
            return true;
        }

        const label = normalizeWeekLabel(
            game.week_label
        );

        return (
            label === "nat'l champ" ||
            label === "national championship"
        );
    }

    /*
     * Determines whether a game is a Bowl.
     */
    function isBowlGame(
        game: Game
    ): boolean {
        const type = normalizeGameType(
            game.game_type
        );

        if (
            type === "bowl" ||
            type === "bowl game"
        ) {
            return true;
        }

        const label = normalizeWeekLabel(
            game.week_label
        );

        return label.startsWith("bowl");
    }

    /*
     * Determines whether a game is a Playoff game.
     */
    function isPlayoffGame(
        game: Game
    ): boolean {
        if (game.is_playoff) {
            return true;
        }

        const type = normalizeGameType(
            game.game_type
        );

        if (type === "playoff") {
            return true;
        }

        const label = normalizeWeekLabel(
            game.week_label
        );

        return label.startsWith("playoff");
    }

    function getGameTypeLabel(game: Game): string {
        if (isConferenceChampionship(game)) {
            return "🏆 Conference Championship";
        }

        if (isNationalChampionship(game)) {
            return "🏆 National Championship";
        }

        if (isBowlGame(game)) {
            return "🏆 Bowl Game";
        }

        if (isPlayoffGame(game)) {
            return "🏆 Playoff";
        }

        const type = getGameType(game);

        if (type === "rivalry") {
            return "⚔️ Rivalry";
        }

        return "";
    }

    function getWeekLabel(game: Game): string {
        /*
         * Prefer the imported week_label because it contains
         * things like:
         *
         * Week 13
         * Conf Champ
         * Bowl 2
         * Nat'l Champ
         */
        if (game.week_label) {
            return game.week_label;
        }

        if (
            game.week !== null &&
            game.week !== undefined
        ) {
            return `Week ${game.week}`;
        }

        if (isConferenceChampionship(game)) {
            return "Conference Championship";
        }

        if (isNationalChampionship(game)) {
            return "National Championship";
        }

        if (isBowlGame(game)) {
            return "Bowl Game";
        }

        if (isPlayoffGame(game)) {
            return "Playoff";
        }

        return "Post-Season";
    }

    function getGameSortValue(game: Game): number {
        if (
            game.sort_order !== null &&
            game.sort_order !== undefined
        ) {
            return game.sort_order;
        }

        if (
            game.week !== null &&
            game.week !== undefined
        ) {
            return game.week;
        }

        if (isConferenceChampionship(game)) {
            return 17;
        }

        if (isBowlGame(game)) {
            /*
             * If the label contains Bowl 2, Bowl 3, etc.,
             * preserve that ordering.
             */
            const match =
                normalizeWeekLabel(
                    game.week_label
                ).match(/^bowl\s+(\d+)$/);

            if (match) {
                return 17 + Number(match[1]);
            }

            return 18;
        }

        if (isPlayoffGame(game)) {
            const match =
                normalizeWeekLabel(
                    game.week_label
                ).match(/^playoff\s+(\d+)$/);

            if (match) {
                return 20 + Number(match[1]);
            }

            return 20;
        }

        if (isNationalChampionship(game)) {
            return 30;
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
        const homeControl = getControlForTeam(
            seasonId,
            game.home_team
        );

        const awayControl = getControlForTeam(
            seasonId,
            game.away_team
        );

        const homeIsUser =
            homeControl?.control_type === "user";

        const awayIsUser =
            awayControl?.control_type === "user";

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
        const matchupType =
            getGameMatchupType(
                seasonId,
                game
            );

        if (matchupType === "user-user") {
            return `<span class="game-matchup-user-user">USER VS USER</span>`;
        }

        if (matchupType === "user-cpu") {
            return `<span class="game-matchup-user-cpu">USER VS CPU</span>`;
        }

        return "";
    }

    function getUserName(
        control: TeamControl
    ): string {
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
                const aName =
                    getUserName(a).toLowerCase();

                const bName =
                    getUserName(b).toLowerCase();

                return aName.localeCompare(
                    bName
                );
            });
    }

    /*
     * IMPORTANT:
     *
     * This is now intentionally broad.
     *
     * A game counts as postseason if ANY reliable
     * postseason indicator says it is.
     */
    function isPostseasonGame(
        game: Game
    ): boolean {
        if (
            isConferenceChampionship(game) ||
            isNationalChampionship(game) ||
            isBowlGame(game) ||
            isPlayoffGame(game)
        ) {
            return true;
        }

        /*
         * Final fallback:
         * if there is no week number and there is a
         * week label, it may be an older postseason
         * import.
         */
        const label =
            normalizeWeekLabel(
                game.week_label
            );

        if (
            label === "post season" ||
            label === "postseason"
        ) {
            return true;
        }

        return false;
    }

    function getTeamRecord(
        teamName: string,
        seasonGames: Game[]
    ): {
        wins: number;
        losses: number;
    } {
        let wins = 0;
        let losses = 0;

        for (const game of seasonGames) {
            if (
                game.home_score === null ||
                game.away_score === null
            ) {
                continue;
            }

            const isHome =
                game.home_team.toLowerCase() ===
                teamName.toLowerCase();

            const isAway =
                game.away_team.toLowerCase() ===
                teamName.toLowerCase();

            if (!isHome && !isAway) {
                continue;
            }

            const teamScore = isHome
                ? game.home_score
                : game.away_score;

            const opponentScore = isHome
                ? game.away_score
                : game.home_score;

            if (teamScore > opponentScore) {
                wins++;
            } else if (
                teamScore < opponentScore
            ) {
                losses++;
            }
        }

        return {
            wins,
            losses,
        };
    }

    function getPostseasonResult(
        teamName: string,
        seasonGames: Game[]
    ): {
        madePostseason: boolean;
        label: string;
    } {
        /*
         * Find every postseason game involving
         * this particular team.
         */
        const postseasonGames = seasonGames
            .filter(
                (game) =>
                    isPostseasonGame(game) &&
                    (
                        game.home_team.toLowerCase() ===
                            teamName.toLowerCase() ||
                        game.away_team.toLowerCase() ===
                            teamName.toLowerCase()
                    )
            )
            .sort(
                (a, b) =>
                    getGameSortValue(a) -
                    getGameSortValue(b)
            );

        /*
         * No postseason games at all.
         */
        if (
            postseasonGames.length === 0
        ) {
            return {
                madePostseason: false,
                label: "No Postseason",
            };
        }

        /*
         * NATIONAL CHAMPION
         *
         * Check this first because winning the national
         * championship is the highest accomplishment.
         */
        const nationalChampionshipGame =
            postseasonGames.find(
                (game) =>
                    isNationalChampionship(game)
            );

        if (
            nationalChampionshipGame &&
            getTeamWonGame(
                teamName,
                nationalChampionshipGame
            )
        ) {
            return {
                madePostseason: true,
                label: "National Champion",
            };
        }

        /*
         * NATIONAL CHAMPIONSHIP RUNNER-UP
         */
        if (nationalChampionshipGame) {
            return {
                madePostseason: true,
                label:
                    "National Championship Runner-Up",
            };
        }

        /*
         * CONFERENCE CHAMPION
         */
        const conferenceChampionshipGame =
            postseasonGames.find(
                (game) =>
                    isConferenceChampionship(game)
            );

        if (
            conferenceChampionshipGame &&
            getTeamWonGame(
                teamName,
                conferenceChampionshipGame
            )
        ) {
            return {
                madePostseason: true,
                label: "Conference Champion",
            };
        }

        /*
         * CONFERENCE CHAMPIONSHIP RUNNER-UP
         */
        if (conferenceChampionshipGame) {
            return {
                madePostseason: true,
                label:
                    "Made Conference Championship",
            };
        }

        /*
         * BOWL WINNER
         */
        const bowlGame =
            postseasonGames.find(
                (game) =>
                    isBowlGame(game)
            );

        if (bowlGame) {
            if (
                getTeamWonGame(
                    teamName,
                    bowlGame
                )
            ) {
                return {
                    madePostseason: true,
                    label: "Bowl Winner",
                };
            }

            return {
                madePostseason: true,
                label: "Made Bowl",
            };
        }

        /*
         * PLAYOFF
         */
        const playoffGame =
            postseasonGames.find(
                (game) =>
                    isPlayoffGame(game)
            );

        if (playoffGame) {
            return {
                madePostseason: true,
                label: "Made Playoff",
            };
        }

        /*
         * Generic postseason fallback.
         */
        return {
            madePostseason: true,
            label: "Made Postseason",
        };
    }

    function getTeamWonGame(
        teamName: string,
        game: Game
    ): boolean {
        if (
            game.home_score === null ||
            game.away_score === null
        ) {
            return false;
        }

        const isHome =
            game.home_team.toLowerCase() ===
            teamName.toLowerCase();

        if (isHome) {
            return (
                game.home_score >
                game.away_score
            );
        }

        return (
            game.away_score >
            game.home_score
        );
    }

    function renderGameRow(
        seasonId: string,
        game: Game
    ): string {
        return `
            <tr>
                <td>
                    ${escapeHtml(
                        getWeekLabel(game)
                    )}
                </td>

                <td>
                    ${getLogoHtml(
                        game.home_team
                    )}
                    ${escapeHtml(
                        game.home_team
                    )}
                </td>

                <td class="season-history-score">
                    ${
                        game.home_score ?? "-"
                    } - ${
                        game.away_score ?? "-"
                    }
                </td>

                <td>
                    ${getLogoHtml(
                        game.away_team
                    )}
                    ${escapeHtml(
                        game.away_team
                    )}
                </td>

                <td class="season-history-type">
                    ${getGameTypeLabel(game)}
                    ${getMatchupLabel(
                        seasonId,
                        game
                    )}
                </td>
            </tr>
        `;
    }

    function renderUserSection(
        season: Season,
        control: TeamControl,
        seasonGames: Game[]
    ): string {
        const teamName =
            control.teams?.name ??
            "Unknown Team";

        const userName =
            getUserName(control);

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

        const record =
            getTeamRecord(
                teamName,
                seasonGames
            );

        const postseason =
            getPostseasonResult(
                teamName,
                seasonGames
            );

        return `
            <div class="season-user-section">

                <div class="season-user-heading">
                    <h3>
                        ${escapeHtml(
                            userName
                        )} — ${escapeHtml(
                            teamName
                        )}
                    </h3>

                    <div class="season-user-summary">
                        <strong>
                            ${record.wins}-${record.losses}
                        </strong>

                        <span class="season-postseason-status ${
                            postseason.madePostseason
                                ? "made-postseason"
                                : "no-postseason"
                        }">
                            ${
                                postseason.madePostseason
                                    ? `🏆 ${escapeHtml(
                                          postseason.label
                                      )}`
                                    : escapeHtml(
                                          postseason.label
                                      )
                            }
                        </span>
                    </div>
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
                            .map(
                                (game) =>
                                    renderGameRow(
                                        season.id,
                                        game
                                    )
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
                    getGameMatchupType(
                        season.id,
                        game
                    ) === "cpu-cpu"
            )
            .sort(
                (a, b) =>
                    getGameSortValue(a) -
                    getGameSortValue(b)
            );

        if (
            otherGames.length === 0
        ) {
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
                            .map(
                                (game) =>
                                    renderGameRow(
                                        season.id,
                                        game
                                    )
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
                (game) =>
                    game.season_id ===
                    season.id
            ) ?? [];

        const userTeams =
            getUserControlledTeams(
                season.id
            );

        const userSections =
            userTeams
                .map((control) =>
                    renderUserSection(
                        season,
                        control,
                        seasonGames
                    )
                )
                .join("");

        const otherGames =
            renderOtherGames(
                season,
                seasonGames
            );

        if (
            seasonGames.length === 0
        ) {
            return `
                <section class="season-history-season">

                    <div class="season-history-season-heading">
                        <h2>
                            ${season.year} Season
                        </h2>

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
                    <h2>
                        ${season.year} Season
                    </h2>

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
        if (
            !seasons ||
            seasons.length === 0
        ) {
            seasonHistoryContent.innerHTML = `
                <p class="season-history-empty">
                    No seasons added yet.
                </p>
            `;
            return;
        }

        seasonHistoryContent.innerHTML =
            seasons
                .map(
                    (season: any) =>
                        renderSeason(
                            season as Season
                        )
                )
                .join("");
    }

    renderSeasons();
}

export default init;
