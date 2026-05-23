import "../style.css";
import { supabase } from "../supabase";

async function showDynasty(selectedDynastyId?: string) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false

  const { data: memberships } = await supabase
    .from('dynasty_members')
    .select('dynasty_id')
    .eq('profile_id', session.user.id)

  if (!memberships || memberships.length === 0) {
    const app = document.querySelector<HTMLDivElement>('#app')!
    app.innerHTML = `
      <main class="dynasty-page">
        <nav class="dynasty-nav">
          <a href="/home/">← Home</a>
          <div><a href="#" id="logout-btn" style="color:#f87171;">Log Out</a></div>
        </nav>
        <div style="text-align:center;padding:80px 20px;color:white;">
          <h2>You have no dynasties yet</h2>
          <p 
            style="color:#888;
            margin:16px 0 32px;">
            Create one to get started
          </p>
          <button
            id="create-btn"
            style="
              padding:12px 24px;
              background:#D4A017;
              color:black;
              border:none;
              border-radius:8px;
              font-weight:bold;
              font-size:16px;
              cursor:pointer;
            "
          >
            + Create Dynasty
          </button>
          <div
            id="create-form"
            style="
              display:none;
              margin-top:32px;
              max-width:400px;
              margin-left:auto;
              margin-right:auto;
            "
          >
            <input
              id="dynasty-name"
              type="text"
              placeholder="Dynasty name"
              style="
                width:100%;
                padding:12px;
                background:#1a1a1a;
                color:white;
                border:1px solid #333;
                border-radius:8px;
                font-size:16px;
                margin-bottom:12px;
              "
            />

            <button
              id="submit-dynasty"
              style="
                width:100%;
                padding:12px;
                background:#D4A017;
                color:black;
                border:none;
                border-radius:8px;
                font-weight:bold;
                font-size:16px;
                cursor:pointer;
              "
            >
              Create
            </button>

            <p
              id="create-msg"
              style="
                color:#888;
                margin-top:8px;
              "
            ></p>
          </div>
        </div>
      </main>
    `
    document.querySelector('#logout-btn')?.addEventListener('click', async (e) => {
      e.preventDefault()
      await supabase.auth.signOut()
      window.location.href = '/'
    })
    document.querySelector('#create-btn')?.addEventListener('click', () => {
      const form = document.querySelector<HTMLDivElement>('#create-form')!
      form.style.display = form.style.display === 'none' ? 'block' : 'none'
    })
    document.querySelector('#submit-dynasty')?.addEventListener('click', async () => {
      const name = (document.querySelector('#dynasty-name') as HTMLInputElement).value
      const msg = document.querySelector('#create-msg')!
      if (!name) { msg.textContent = 'Please enter a name'; return }
      const { data: newDynasty, error } = await supabase.from('dynasties').insert({ name, is_active: true }).select().single()
      if (error) { msg.textContent = error.message; return }
      await supabase.from('dynasty_members').insert({ dynasty_id: newDynasty.id, profile_id: session.user.id, role: 'owner' })
      await showDynasty(newDynasty.id)
    })
    return true
  }

  const dynastyIds = memberships.map((m: any) => m.dynasty_id)
  const { data: allDynasties } = await supabase.from('dynasties').select('*').in('id', dynastyIds)

  const activeDynastyId = selectedDynastyId ?? dynastyIds[0]
  const dynasty = allDynasties?.find((d: any) => d.id === activeDynastyId) ?? allDynasties?.[0]

  const dynastyName = dynasty?.name ?? 'No Active Dynasty'
  const dynastyStatus = dynasty?.is_active ? 'Active' : 'Inactive'

  const dynastyOptions = allDynasties?.map((d: any) =>
    `<option value="${d.id}" ${d.id === dynasty?.id ? 'selected' : ''}>${d.name}</option>`
  ).join('') ?? ''

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
          <select id="dynasty-selector" style="width:100%;padding:10px;background:#0f172a;color:white;border:1px solid rgba(148,163,184,0.24);border-radius:8px;font-size:18px;font-weight:bold;margin-bottom:16px;">
            ${dynastyOptions}
          </select>
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
          <p class="eyebrow">Manage Dynasties</p>
          <h2>Create or invite</h2>
          <p>Start a new dynasty or invite someone to yours.</p>

          <div
            style="
              display:flex;
              gap:12px;
              margin-top:20px;
              flex-wrap:wrap;
            "
          >
            <button
              id="show-create"
              style="
                padding:10px 20px;
                background:#D4A017;
                color:black;
                border:none;
                border-radius:8px;
                font-weight:bold;
                cursor:pointer;
              "
            >
              + Create Dynasty
            </button>

            <button
              id="show-invite"
              style="
                padding:10px 20px;
                background:#222;
                color:white;
                border:1px solid #444;
                border-radius:8px;
                cursor:pointer;
              "
            >
              Invite Member
            </button>
          </div>

          <div
            id="create-form"
            style="
              display:none;
              margin-top:20px;
            "
          >
            <input
              id="new-dynasty-name"
              type="text"
              placeholder="Dynasty name"
              style="
                width:100%;
                padding:12px;
                background:#0f172a;
                color:white;
                border:1px solid #333;
                border-radius:8px;
                font-size:16px;
                margin-bottom:8px;
              "
            />

            <button
              id="submit-create"
              style="
                padding:10px 20px;
                background:#D4A017;
                color:black;
                border:none;
                border-radius:8px;
                font-weight:bold;
                cursor:pointer;
              "
            >
              Create
            </button>

            <p
              id="create-msg"
              style="
                color:#D4A017;
                margin-top:8px;
              "
            ></p>
          </div>

          <div
            id="invite-form"
            style="
              display:none;
              margin-top:20px;
            "
          >
            <input
              id="invite-email"
              type="email"
              placeholder="User email"
              style="
                width:100%;
                padding:12px;
                background:#0f172a;
                color:white;
                border:1px solid #333;
                border-radius:8px;
                font-size:16px;
                margin-bottom:8px;
              "
            />

            <button
              id="submit-invite"
              style="
                padding:10px 20px;
                background:#D4A017;
                color:black;
                border:none;
                border-radius:8px;
                font-weight:bold;
                cursor:pointer;
              "
            >
              Invite
            </button>

            <p
              id="invite-msg"
              style="
                color:#D4A017;
                margin-top:8px;
              "
            ></p>
          </div>
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
          <div class="activity-item">
            <span>Your Dynasties</span>
            <strong>${allDynasties?.length ?? 0}</strong>
          </div>
        </div>
      </section>
    </main>
  `

  document.querySelector('#dynasty-selector')?.addEventListener('change', async (e) => {
    const selected = (e.target as HTMLSelectElement).value
    await showDynasty(selected)
  })

  document.querySelector('#logout-btn')?.addEventListener('click', async (e) => {
    e.preventDefault()
    await supabase.auth.signOut()
    window.location.href = '/'
  })

  document.querySelector('#show-create')?.addEventListener('click', () => {
    const f = document.querySelector<HTMLDivElement>('#create-form')!
    f.style.display = f.style.display === 'none' ? 'block' : 'none'
    document.querySelector<HTMLDivElement>('#invite-form')!.style.display = 'none'
  })

  document.querySelector('#show-invite')?.addEventListener('click', () => {
    const f = document.querySelector<HTMLDivElement>('#invite-form')!
    f.style.display = f.style.display === 'none' ? 'block' : 'none'
    document.querySelector<HTMLDivElement>('#create-form')!.style.display = 'none'
  })

  document.querySelector('#submit-create')?.addEventListener('click', async () => {
    const name = (document.querySelector('#new-dynasty-name') as HTMLInputElement).value
    const msg = document.querySelector('#create-msg')!
    if (!name) { msg.textContent = 'Enter a name'; return }
    const { data: newDynasty, error } = await supabase.from('dynasties').insert({ name, is_active: true }).select().single()
    if (error) { msg.textContent = error.message; return }
    await supabase.from('dynasty_members').insert({ dynasty_id: newDynasty.id, profile_id: session.user.id, role: 'owner' })
    msg.textContent = '✅ Dynasty created!'
    await showDynasty(newDynasty.id)
  })

  document.querySelector('#submit-invite')?.addEventListener('click', async () => {
    const email = (document.querySelector('#invite-email') as HTMLInputElement).value
    const msg = document.querySelector('#invite-msg')!
    if (!email) { msg.textContent = 'Enter an email'; return }
    const { data: profile } = await supabase.from('profiles').select('id').eq('username', email).single()
    if (!profile) { msg.textContent = 'User not found — they need to sign up first'; return }
    const { error } = await supabase.from('dynasty_members').insert({ dynasty_id: dynasty?.id, profile_id: profile.id, role: 'member' })
    msg.textContent = error ? error.message : '✅ Member invited!'
  })

  return true
}

async function showLogin() {
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.innerHTML = `
    <div
      style="
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        min-height:100vh;
        background:#0a0a0a;
        color:white;
        font-family:system-ui;
        padding:20px;
      "
    >
      <h1
        style="
          margin-bottom:8px;
        "
      >
        CFB Dynasty
      </h1>

      <p
        style="
          color:#888;
          margin-bottom:32px;
        "
      >
        Sign in to continue
      </p>

      <div
        style="
          display:flex;
          flex-direction:column;
          gap:12px;
          width:100%;
          max-width:360px;
          background:#1a1a1a;
          padding:32px;
          border-radius:12px;
        "
      >
        <input
          id="email"
          type="email"
          placeholder="Email"
          style="
            padding:12px;
            background:#111;
            color:white;
            border:1px solid #333;
            border-radius:8px;
            font-size:16px;
          "
        />

        <input
          id="password"
          type="password"
          placeholder="Password"
          style="
            padding:12px;
            background:#111;
            color:white;
            border:1px solid #333;
            border-radius:8px;
            font-size:16px;
          "
        />

        <button
          id="login-btn"
          style="
            padding:12px;
            background:#D4A017;
            color:black;
            border:none;
            border-radius:8px;
            font-weight:bold;
            font-size:16px;
            cursor:pointer;
          "
        >
          Log In
        </button>

        <p
          id="msg"
          style="
            color:#888;
            text-align:center;
            font-size:14px;
            margin:0;
          "
        ></p>
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
