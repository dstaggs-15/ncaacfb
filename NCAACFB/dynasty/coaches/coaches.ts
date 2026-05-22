import "../../src/style.css";
import { supabase } from "../../src/supabase";
import { getAllDynasties } from "../../src/dynasty/dynastyData";

async function init() {
  const app = document.querySelector<HTMLDivElement>("#coaches-app")!;

  const dynasties = await getAllDynasties();
  const activeDynasty = dynasties[0];

  if (!activeDynasty) {
    app.innerHTML = `<p style="color:white;padding:40px;">No dynasty found.</p>`;
    return;
  }

  const { data: records } = await supabase
    .from('coach_records')
    .select('*, profiles(username)')
    .eq('dynasty_id', activeDynasty.id)
    .order('wins', { ascending: false });

  const recordsHtml = records && records.length > 0
    ? records.map((r: any) => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #222;">${r.profiles?.username ?? 'Unknown'}</td>
          <td style="padding:12px;border-bottom:1px solid #222;">${r.team}</td>
          <td style="padding:12px;border-bottom:1px solid #222;color:#D4A017;font-weight:bold;">${r.wins}-${r.losses}</td>
          <td style="padding:12px;border-bottom:1px solid #222;color:#888;">${r.conference_wins}-${r.conference_losses}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="4" style="padding:16px;color:#888;">No coach records yet. Add them in Add Stats.</td></tr>`;

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
      <p style="color:#888;margin-bottom:40px;">Coach Records</p>
      <table style="width:100%;border-collapse:collapse;background:#111;border-radius:12px;overflow:hidden;">
        <thead>
          <tr style="background:#1a1a1a;color:#888;font-size:13px;text-transform:uppercase;">
            <th style="padding:12px;text-align:left;">Coach</th>
            <th style="padding:12px;text-align:left;">Team</th>
            <th style="padding:12px;text-align:left;">Record</th>
            <th style="padding:12px;text-align:left;">Conf Record</th>
          </tr>
        </thead>
        <tbody>${recordsHtml}</tbody>
      </table>
    </main>
  `;
}

init();
