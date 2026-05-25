import "../../style.css";
import "./seasons.css";
import seasonsHtml from "./seasons.html?raw";

import { supabase } from "../../supabase";
import { getAllDynasties } from "../dynastyData";

function getDynastyIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("dynastyId");
}

async function init() {
    const app = document.querySelector<HTMLDivElement>("#app")!;

    app.innerHTML = seasonsHtml;

    const dynastyNameEl = document.querySelector<HTMLHeadingElement>("#dynasty-name")!;
    const seasonHistoryContent = document.querySelector<HTMLElement>("#season-history-content")!;

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

    const activeDynasty = dynasties.find((dynasty: any) => dynasty.id === dynastyId);

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
        .eq("dynasty_id", activeDynasty.id)
        .order("week", { ascending: true });

    if (gamesError) {
        console.error("Error loading games:", gamesError);

        seasonHistoryContent.innerHTML = `
            <p class="season-history-empty">
                Could not load games.
            </p>
        `;
        return;
    }

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

    function getLogoHtml(teamName: string) {
        const logo = teamLogoMap[teamName.toLowerCase()];

        if (!logo) {
            return "";
        }

        return `
            <img
                src="${logo}"
                alt="${teamName} logo"
                class="team-logo"
            />
        `;
    }

    function formatGameWeek(week: number | null | undefined) {
        if (week === null || week === undefined) {
            return "Post-Season";
        }

        return `Week ${week}`;
    }

    function getGameTypeLabel(game: any) {
        if (game.is_playoff) {
            return "🏆 Playoff";
        }

        if (game.is_rivalry) {
            return "⚔️ Rivalry";
        }

        return "";
    }

    function renderGamesForSeason(seasonId: string) {
        const seasonGames = games?.filter((game: any) => game.season_id === seasonId) ?? [];

        if (seasonGames.length === 0) {
            return `
                <tr>
                    <td colspan="5" class="season-history-empty-row">
                        No games entered yet
                    </td>
                </tr>
            `;
        }

        return seasonGames
            .map((game: any) => {
                return `
                    <tr>
                        <td>${formatGameWeek(game.week)}</td>

                        <td>
                            ${getLogoHtml(game.home_team)}
                            ${game.home_team}
                        </td>

                        <td class="season-history-score">
                            ${game.home_score ?? "-"} - ${game.away_score ?? "-"}
                        </td>

                        <td>
                            ${getLogoHtml(game.away_team)}
                            ${game.away_team}
                        </td>

                        <td class="season-history-type">
                            ${getGameTypeLabel(game)}
                        </td>
                    </tr>
                `;
            })
            .join("");
    }

    function renderSeasons() {
        if (!seasons || seasons.length === 0) {
            seasonHistoryContent.innerHTML = `
                <p class="season-history-empty">
                    No seasons added yet. Go to Add Stats to create one.
                </p>
            `;
            return;
        }

        seasonHistoryContent.innerHTML = seasons
            .map((season: any) => {
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
                                ${renderGamesForSeason(season.id)}
                            </tbody>
                        </table>
                    </section>
                `;
            })
            .join("");
    }

    renderSeasons();
}

export default init;