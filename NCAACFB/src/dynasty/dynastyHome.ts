import "../style.css";
import { supabase } from "../supabase";

async function showDynasty() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false

  const { data: memberships } = await supabase
    .from('dynasty_members')
    .select('dynasty_id')
    .eq('profile_id', session.user.id)

  let dynastyName = 'No Active Dynasty'
  let dynastyStatus = 'Inactive'

  if (memberships && memberships.length > 0) {
    const { data: dynasty } = await supabase
      .from('dynasties')
      .select('*')
      .eq('id', memberships[0].dynasty_id)
      .single()

    if (dynasty) {
      dynastyName = dynasty.name
      dynastyStatus = dynasty.is_active ? 'Active' : 'Inactive'
    }
  }

  const app = document.querySelector<HTMLDivElement>('#app')!
  if (!app) return false

  app.innerHTML = `
    <main class="dynasty-page">
      <nav class="dynasty-nav">
        <a href="/home/">← Home</a>
        <div>
          <a href="/dynasty/">Dynasty</a>
          <a href="/blogger/">Blogger</a>
          <a href="/dynasty/add/">+ Add Stats</a>
          <a href="#" id="logout-btn" style="color: #f87171;">Log Out</a>
        </div>
      </nav>
      <section class="dynasty-hero">
        <div class="hero-content">
          <p class="eyebrow">CFB26 Multiplayer Hub</p>
          <h1>Dynasty Companion</h1>
          <p class="hero-copy">
            Track teams, coaches, records, seasons, rivalries, playoff runs, and every bit of digital football folklore your league creates.
          </p>
          <div class="hero-actions">
            <a class="primary-button" href="/dynasty/seasons/">View Dynasties</a>
          </div>
        </div>
        <aside class="scoreboard-card">
          <p class="scoreboard-label">Active Dynasty</p>
          <h2>${dynastyName}</h2>
          <div class="score-row">
            <span>Status</span>
            <strong>${dynastyStatus}</strong>
          </div>
        </aside>
      </section>
      <section class="dynasty-grid">
        <a class="dynasty-card" href="/dynasty/teams/">
          <span class="card-kicker">Roster Room</span>
          <h2>Teams</h2>
          <p>View user teams, CPU teams, records, conferences, and program history.</p>
        </a>
        <a class="dynasty-card" href="/dynasty/seasons/">
          <span class="card-kicker">Yearbook</span>
          <h2>Seasons</h2>
          <p>Track yearly records, champions, playoff brackets, bowls, and final rankings.</p>
        </a>
        <a class="dynasty-card" href="/dynasty/coaches/">
          <span class="card-kicker">Sideline Ledger</span>
          <h2>Coaches</h2>
          <p>Follow coach careers, rivalries, records, schools, and legacy arcs.</p>
        </a>
        <a class="dynasty-card" href="/dynasty/standings/">
          <span class="card-kicker">Conference Table</span>
          <h2>Standings</h2>
          <p>See who is rising, collapsing, surviving, or becoming bulletin-board material.</p>
        </a>
      </section>
      <section class="activity-panel">
        <div>
          <p class="eyebrow">Latest Chronicle</p>
          <h2>Build the story as the dynasty unfolds</h2>
          <p>Add results, notes, awards, playoff drama, coaching changes, and rivalry moments here later.</p>
        </div>
        <div class="activity-list">
          <div class="activity-item">
            <span>Dynasty</span>
            <strong>${dynastyName}</strong>
          </div>
          <div class="activity-item">
            <span>Status</span>
            <strong>${dynastyStatus}</strong>
          </div>
        </div>
      </section>
    </main>
  `

  document.querySelector('#logout-btn')?.addEventListener('click', async (e) => {
    e.preventDefault()
    await supabase.auth.signOut()
    window.location.href = '/'
  })

  return true
}

async function showLogin() {
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#0a0a0a;color:white;font-family:system-ui;padding:20px;">
      <h1 style="margin-bottom:8px;">CFB Dynasty</h1>
      <p style="color:#888;margin-bottom:32px;">Sign in to continue</p>
      <div style="display:flex;flex-direction:column;gap:12px;width:100%;max-width:360px;background:#1a1a1a;padding:32px;border-radius:12px;">
        <input id="email" type="email" placeholder="Email" style="padding:12px;background:#111;color:white;border:1px solid #333;border-radius:8px;font-size:16px;" />
        <input id="password" type="password" placeholder="Password" style="padding:12px;background:#111;color:white;border:1px solid #333;border-radius:8px;font-size:16px;" />
        <button id="login-btn" style="padding:12px;background:#D4A017;color:black;border:none;border-radius:8px;font-weight:bold;font-size:16px;cursor:pointer;">Log In</button>
        <p id="msg" style="color:#888;text-align:center;font-size:14px;margin:0;"></p>
      </div>
    </div>
  `

  document.querySelector('#login-btn')?.addEventListener('click', async () => {
    const email = (document.querySelector('#email') as HTMLInputElement).value
    const password = (document.querySelector('#password') as HTMLInputElement).value
    const msg = document.querySelector('#msg')!
    msg.textContent = 'Signing in...'
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { msg.textContent = error.message; return }
    await showDynasty()
  })
}

export default async function init() {
  const loaded = await showDynasty()
  if (!loaded) await showLogin()
}
