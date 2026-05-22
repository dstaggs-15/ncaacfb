import "../../src/style.css";
import { supabase } from "../../src/supabase";
import { getAllDynasties } from "../../src/dynasty/dynastyData";

async function init() {
  const app = document.querySelector<HTMLDivElement>("#seasons-app")!;

  const dynasties = await getAllDynasties();
  const activeDynasty = dynasties[0];

  if (!activeDynasty) {
    app.innerHTML = `<p style="color:white;padding:40px;">No dynasty found.</p>`;
    return;
  }

  const { data: seasons } = await supabase
    .from('seasons')
    .select('*')
    .eq('dynasty_id', activeDynasty.id)
    .order('year', { ascending: false });

  const { data: games } = await supabase
    .from('games')
    .select('*')
    .eq('dynasty_id', activeDynasty.id)
    .order('week', { ascending: true });

  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .eq('dynasty_id', activeDynasty.id);

  const teamLogoMap: Record<string, string> = {};
  if (teams) {
    teams.forEach((t: any) => {
      if (t.logo_url) teamLogoMap[t.name.toLowerCase()] = t.logo_url;
    });
  }

  function getLogoHtml(teamName: string) {
    const logo = teamLogoMap[teamName.toLowerCase()];
    if (logo) {
      return `<img src="${logo}" style="width:28px;height:28px;object-fit:contain;vertical-align:middle;margin-right:6px;" />`;
    }
    return '';
  }

  const seasonsHtml = seasons && seasons.length > 0
    ? seasons.map((season: any) => {
        const seasonGames = games?.filter((g: any) => g.season_id === season.id) ?? [];
        const gamesHtml = seasonGames.length > 0
          ? seasonGames.map((g: any) => `
              <tr>
                <td style="padding:10px;border-bottom:1px solid #222;">Week ${g.week ?? '-'}</td>
                <td style="padding:10px;border-bottom:1px solid #222;">
                  ${getLogoHtml(g.home_team)}${g.home_team}
                </td>
                <td style="padding:10px;border-bottom:1px solid #222;font-weight:bold;color:#D4A017;">
                  ${g.home_score ?? '-'} - ${g.away_score ?? '-'}
                </td>
                <td style="padding:10px;border-bottom:1px solid #222;">
                  ${getLogoHtml(g.away_team)}${g.away_team}
                </td>
                <td style="padding:10px;border-bottom:1px solid #222;color:#888;font-size:13px;">
                  ${g.is_playoff ? '🏆 Playoff' : g.is_rivalry ? '⚔️ Rivalry' : ''}
                </td>
              </tr>
            `).join('')
          : `<tr><td colspan="5" style="padding:16px;color:#888;">No games entered yet</td></tr>`;

        return `
          <div style="margin-bottom:40px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
              <h2 style="margin:0;font-size:24px;">${season.year} Season</h2>
              ${season.is_current ? '<span style="background:#D4A017;color:black;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:bold;">Current</span>' : ''}
            </div>
            <table style="width:100%;border-collapse:collapse;background:#111;border-radius:12px;overflow:hidden;">
              <thead>
                <tr style="background:#1a1a1a;color:#888;font-size:13px;text-transform:uppercase;">
                  <th style="padding:10px;text-align:left;">Week</th>
                  <th style="padding:10px;text-align:left;">Home</th>
                  <th style="padding:10px;text-align:left;">Score</th>
                  <th style="padding:10px;text-align:left;">Away</th>
                  <th style="padding:10px;text-align:left;">Type</th>
                </tr>
              </thead>
              <tbody>${gamesHtml}</tbody>
            </table>
          </div>
        `;
      }).join('')
    : `<p style="color:#888;">No seasons added yet. Go to Add Stats to create one.</p>`;

  app.innerHTML = `
    <main style="
      min-height:100vh;
      background:#0a0a0a;
      color:white;
      font-family:system-ui;
      padding:40px 20px;
      max-width:900px;
      margin:0 auto;
    ">
      <nav style="display:flex;justify-content:space-between;align-items:center;margin-bottom:40px;">
        <a href="/dynasty/" style="color:#D4A017;text-decoration:none;">← Dynasty</a>
        <div style="display:flex;gap:20px;">
          <a href="/dynasty/add/" style="color:#888;text-decoration:none;">+ Add Stats</a>
          <a href="/home/" style="color:#888;text-decoration:none;">Home</a>
        </div>
      </nav>
      <h1 style="font-size:40px;margin-bottom:4px;">${activeDynasty.name}</h1>
      <p style="color:#888;margin-bottom:40px;">Season History</p>
      ${seasonsHtml}
    </main>
  `;
}

init();
