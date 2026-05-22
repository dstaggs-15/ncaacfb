import "../style.css";
import { supabase } from "../supabase";
import { getAllDynasties } from "./dynastyData";

async function init() {
  const dynasties = await getAllDynasties();
  const app = document.querySelector<HTMLDivElement>("#add-app")!;

  const dynastyOptions = dynasties.map((d: any) =>
    `<option value="${d.id}">${d.name}</option>`
  ).join('')

  app.innerHTML = `
    <main style="
      min-height: 100vh;
      background: #0a0a0a;
      color: white;
      font-family: system-ui;
      padding: 40px 20px;
      max-width: 600px;
      margin: 0 auto;
    ">
      <a href="/home/" style="color: #D4A017; text-decoration: none;">← Back to Home</a>
      <h1 style="margin: 24px 0 8px;">Add Stats</h1>
      <p style="color: #888; margin-bottom: 40px;">Submit game results, seasons, trophies, and teams</p>

      <div style="display: flex; gap: 12px; margin-bottom: 32px; flex-wrap: wrap;">
        <button id="tab-game" style="padding: 10px 20px; background: #D4A017; color: black; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Game Result</button>
        <button id="tab-season" style="padding: 10px 20px; background: #222; color: white; border: none; border-radius: 8px; cursor: pointer;">New Season</button>
        <button id="tab-trophy" style="padding: 10px 20px; background: #222; color: white; border: none; border-radius: 8px; cursor: pointer;">Trophy</button>
        <button id="tab-team" style="padding: 10px 20px; background: #222; color: white; border: none; border-radius: 8px; cursor: pointer;">Team Logo</button>
      </div>

      <div id="form-area"></div>
      <p id="status-msg" style="margin-top: 16px; color: #D4A017;"></p>
    </main>
  `

  const statusMsg = document.querySelector<HTMLParagraphElement>('#status-msg')!
  const formArea = document.querySelector<HTMLDivElement>('#form-area')!

  async function getSeasonOptions(dynastyId: string) {
    const { data } = await supabase
      .from('seasons')
      .select('*')
      .eq('dynasty_id', dynastyId)
      .order('year', { ascending: false })
    if (!data || data.length === 0) return '<option value="">No seasons yet</option>'
    return data.map((s: any) => `<option value="${s.id}">${s.year} Season</option>`).join('')
  }

  async function showGameForm() {
    const seasonOptions = await getSeasonOptions(dynasties[0]?.id)
    formArea.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <select id="dynasty-select" style="padding: 12px; background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 8px;">
          ${dynastyOptions}
        </select>
        <select id="season-select" style="padding: 12px; background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 8px;">
          ${seasonOptions}
        </select>
        <input id="home-team" type="text" placeholder="Home Team" style="padding: 12px; background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 8px;" />
        <input id="away-team" type="text" placeholder="Away Team" style="padding: 12px; background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 8px;" />
        <input id="home-score" type="number" placeholder="Home Score" style="padding: 12px; background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 8px;" />
        <input id="away-score" type="number" placeholder="Away Score" style="padding: 12px; background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 8px;" />
        <input id="week" type="number" placeholder="Week" style="padding: 12px; background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 8px;" />
        <label style="display: flex; align-items: center; gap: 8px;">
          <input id="is-rivalry" type="checkbox" /> Rivalry Game
        </label>
        <label style="display: flex; align-items: center; gap: 8px;">
          <input id="is-playoff" type="checkbox" /> Playoff Game
        </label>
        <button id="submit-game" style="padding: 12px; background: #D4A017; color: black; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Submit Game</button>
      </div>
    `

    document.querySelector('#dynasty-select')?.addEventListener('change', async (e) => {
      const dynastyId = (e.target as HTMLSelectElement).value
      const seasonSelect = document.querySelector('#season-select') as HTMLSelectElement
      seasonSelect.innerHTML = await getSeasonOptions(dynastyId)
    })

    document.querySelector('#submit-game')?.addEventListener('click', async () => {
      const dynastyId = (document.querySelector('#dynasty-select') as HTMLSelectElement).value
      const seasonId = (document.querySelector('#season-select') as HTMLSelectElement).value
      const homeTeam = (document.querySelector('#home-team') as HTMLInputElement).value
      const awayTeam = (document.querySelector('#away-team') as HTMLInputElement).value
      const homeScore = parseInt((document.querySelector('#home-score') as HTMLInputElement).value)
      const awayScore = parseInt((document.querySelector('#away-score') as HTMLInputElement).value)
      const week = parseInt((document.querySelector('#week') as HTMLInputElement).value)
      const isRivalry = (document.querySelector('#is-rivalry') as HTMLInputElement).checked
      const isPlayoff = (document.querySelector('#is-playoff') as HTMLInputElement).checked

      const { error } = await supabase.from('games').insert({
        dynasty_id: dynastyId,
        season_id: seasonId,
        home_team: homeTeam,
        away_team: awayTeam,
        home_score: homeScore,
        away_score: awayScore,
        week: week,
        is_rivalry: isRivalry,
        is_playoff: isPlayoff
      })

      statusMsg.textContent = error ? error.message : '✅ Game submitted!'
    })
  }

  function showSeasonForm() {
    formArea.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <select id="dynasty-select-season" style="padding: 12px; background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 8px;">
          ${dynastyOptions}
        </select>
        <input id="season-year" type="number" placeholder="Year (e.g. 2026)" style="padding: 12px; background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 8px;" />
        <label style="display: flex; align-items: center; gap: 8px;">
          <input id="is-current" type="checkbox" /> Current Season
        </label>
        <button id="submit-season" style="padding: 12px; background: #D4A017; color: black; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Submit Season</button>
      </div>
    `

    document.querySelector('#submit-season')?.addEventListener('click', async () => {
      const dynastyId = (document.querySelector('#dynasty-select-season') as HTMLSelectElement).value
      const year = parseInt((document.querySelector('#season-year') as HTMLInputElement).value)
      const isCurrent = (document.querySelector('#is-current') as HTMLInputElement).checked

      const { error } = await supabase.from('seasons').insert({
        dynasty_id: dynastyId,
        year: year,
        is_current: isCurrent
      })

      statusMsg.textContent = error ? error.message : '✅ Season created!'
    })
  }

  function showTrophyForm() {
    formArea.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <select id="dynasty-select-trophy" style="padding: 12px; background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 8px;">
          ${dynastyOptions}
        </select>
        <input id="trophy-team" type="text" placeholder="Team Name" style="padding: 12px; background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 8px;" />
        <select id="trophy-type" style="padding: 12px; background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 8px;">
          <option value="playoff">Playoff</option>
          <option value="conference_championship">Conference Championship</option>
          <option value="rivalry">Rivalry Trophy</option>
          <option value="national_championship">National Championship</option>
        </select>
        <input id="trophy-name" type="text" placeholder="Trophy Name (e.g. Iron Bowl Trophy)" style="padding: 12px; background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 8px;" />
        <button id="submit-trophy" style="padding: 12px; background: #D4A017; color: black; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Submit Trophy</button>
      </div>
    `

    document.querySelector('#submit-trophy')?.addEventListener('click', async () => {
      const dynastyId = (document.querySelector('#dynasty-select-trophy') as HTMLSelectElement).value
      const team = (document.querySelector('#trophy-team') as HTMLInputElement).value
      const trophyType = (document.querySelector('#trophy-type') as HTMLSelectElement).value
      const trophyName = (document.querySelector('#trophy-name') as HTMLInputElement).value

      const { error } = await supabase.from('trophies').insert({
        dynasty_id: dynastyId,
        team: team,
        trophy_type: trophyType,
        trophy_name: trophyName
      })

      statusMsg.textContent = error ? error.message : '✅ Trophy awarded!'
    })
  }

  function showTeamForm() {
    formArea.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <select id="dynasty-select-team" style="padding: 12px; background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 8px;">
          ${dynastyOptions}
        </select>
        <input id="team-name" type="text" placeholder="Team Name (e.g. Alabama)" style="padding: 12px; background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 8px;" />
        <input id="team-conference" type="text" placeholder="Conference (e.g. SEC)" style="padding: 12px; background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 8px;" />
        <label style="color: #888; font-size: 14px;">Team Logo</label>
        <input id="team-logo" type="file" accept="image/*" style="padding: 12px; background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 8px;" />
        <div id="logo-preview" style="display: none; margin-top: 8px;">
          <img id="preview-img" style="width: 80px; height: 80px; object-fit: contain; border-radius: 8px; background: #1a1a1a; padding: 8px;" />
        </div>
        <button id="submit-team" style="padding: 12px; background: #D4A017; color: black; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Submit Team</button>
      </div>
    `

    document.querySelector('#team-logo')?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const preview = document.querySelector('#logo-preview') as HTMLDivElement
        const img = document.querySelector('#preview-img') as HTMLImageElement
        img.src = URL.createObjectURL(file)
        preview.style.display = 'block'
      }
    })

    document.querySelector('#submit-team')?.addEventListener('click', async () => {
      const dynastyId = (document.querySelector('#dynasty-select-team') as HTMLSelectElement).value
      const teamName = (document.querySelector('#team-name') as HTMLInputElement).value
      const conference = (document.querySelector('#team-conference') as HTMLInputElement).value
      const fileInput = document.querySelector('#team-logo') as HTMLInputElement
      const file = fileInput.files?.[0]

      statusMsg.textContent = 'Uploading...'

      let logoUrl = null

      if (file) {
        const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`
        const { error: uploadError } = await supabase.storage
          .from('team-logos')
          .upload(fileName, file)

        if (uploadError) {
          statusMsg.textContent = uploadError.message
          return
        }

        const { data } = supabase.storage
          .from('team-logos')
          .getPublicUrl(fileName)

        logoUrl = data.publicUrl
      }

      const { error } = await supabase.from('teams').insert({
        dynasty_id: dynastyId,
        name: teamName,
        conference: conference,
        logo_url: logoUrl
      })

      statusMsg.textContent = error ? error.message : '✅ Team added!'
    })
  }

  document.querySelector('#tab-game')!.addEventListener('click', () => showGameForm())
  document.querySelector('#tab-season')!.addEventListener('click', () => showSeasonForm())
  document.querySelector('#tab-trophy')!.addEventListener('click', () => showTrophyForm())
  document.querySelector('#tab-team')!.addEventListener('click', () => showTeamForm())

  showGameForm()
}

init()
