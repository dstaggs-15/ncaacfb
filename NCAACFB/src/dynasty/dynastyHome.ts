import "../style.css";
import { supabase } from "../supabase";

export default async function init() {
  // Check login
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    window.location.href = '/'
    return
  }

  // Get dynasties directly
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
  if (!app) return

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
            <a class="primary-button" href="/dynasty/seasons/">View Seasons</a>
            <a class="secondary-button" href="/dynasty/teams/">View Teams</a>
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
}
