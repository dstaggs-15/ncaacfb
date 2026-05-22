import "../../src/style.css";
import { supabase } from "../../src/supabase";
import { getAllDynasties } from "../../src/dynasty/dynastyData";

async function init() {
  const app = document.querySelector<HTMLDivElement>("#standings-app")!;

  const dynasties = await getAllDynasties();
  const activeDynasty = dynasties[0];

  if (!activeDynasty) {
    app.innerHTML = `<p style="color:white;padding:40px;">No dynasty found.</p>`;
    return;
  }

  const { data: games } = await supabase
    .from('games')
    .select('*')
    .eq('dynasty_id', activeDynasty.id);

  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .eq('dynasty_id', activeDynasty.id);

  // Build standings from games
  const standings: Record<string, { wins: number; losses: number; logo?: string }> = {};

  if (games) {
    games.forEach((g: any) => {
      const home = g.home_team;
      const away = g.away_team;

      if (!standings[home]) standings[home] = { wins: 0, losses: 0 };
      if (!standings[away]) standings[away] = { wins: 0, losses: 0 };

      if (g.home_score > g.away_score) {
        standings[home].wins++;
        standings[away].losses++;
      } else if (g.away_score > g.home_score) {
        standings[away].wins++;
        standings[home].losses++;
      }
    });
  }

  // Attach logos
  if (teams) {
    teams.forEach((t: any) => {
      const key = t.name.toLowerCase();
      Object.keys(standings).forEach(team => {
        if (team.toLowerCase() === key && t.logo_url) {
          standings[team].logo = t.logo_url;
        }
      });
    });
  }

  const sorted = Object.entries(standings).sort((a, b) => {
    const aWinPct = a[1].wins / (a[1].wins + a[1].losses) || 0;
    const bWinPct = b[1].wins / (b[1].wins + b[1].losses) || 0;
    return bWinPct - aWinPct;
  });

  const standingsHtml = sorted.length > 0
    ? sorted.map(([team, record], index) => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #222;color:#888;">${index + 1}</td>
          <td style="padding:12px;border-bottom:1px solid #222;">
            ${record.logo ? `<img src="${record.logo}" style="width:28px;height:28px;object-fit:contain;vertical-align:middle;margin-right:8px;" />` : ''}
            ${team}
          </td>
          <td style="padding:12px;border-bottom:1px solid #222;color:#D4A017;font-weight:bold;">${record.wins}-${record.losses}</td>
          <td style="padding:12px;border-bottom:1px solid #222;color:#888;">
            ${record.wins + record.losses > 0 ? ((record.wins / (record.wins + record.losses)) * 100).toFixed(1) + '%' : '-'}
          </td>
        </tr>
      `).join('')
    : `<tr><td colspan="4" style="padding:16px;color:#888;">No games entered yet.</td></tr>`;

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
      <p style="color:#888;margin-bottom:40px;">Standings</p>
      <table style="width:100%;border-collapse:collapse;background:#111;border-radius:12px;overflow:hidden;">
        <thead>
          <tr style="background:#1a1a1a;color:#888;font-size:13px;text-transform:uppercase;">
            <th style="padding:12px;text-align:left;">#</th>
            <th style="padding:12px;text-align:left;">Team</th>
            <th style="padding:12px;text-align:left;">Record</th>
            <th style="padding:12px;text-align:left;">Win %</th>
          </tr>
        </thead>
        <tbody>${standingsHtml}</tbody>
      </table>
    </main>
  `;
}

init();
