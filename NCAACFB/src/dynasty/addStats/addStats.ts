import '../../style.css'
import './addStats.css'
import pageHtml from './addStats.html?raw'
import { supabase } from '../../supabase'
import { getAllDynasties } from '../dynastyData'

type Dynasty = {
  id: string
  name: string
}

type AddStatsTab = 'game' | 'season' | 'team' | 'trophy'

export default async function initAddStatsPage() {
  const app = document.querySelector<HTMLDivElement>('#app')

  if (!app) {
    console.error('Could not find #app container.')
    return
  }

  app.innerHTML = pageHtml

  const formArea = document.querySelector<HTMLDivElement>('#form-area')
  const statusMessage = document.querySelector<HTMLParagraphElement>('#status-message')

  if (!formArea || !statusMessage) {
    console.error('Add Stats page is missing #form-area or #status-message.')
    return
  }

  const dynasties = await getAllDynasties() as Dynasty[]
  const dynastyOptions = buildDynastyOptions(dynasties)

  function setStatus(message: string, type: 'success' | 'error' | 'neutral' = 'neutral') {
    statusMessage.textContent = message
    statusMessage.className = `status-message ${type}`
  }

  function setActiveTab(tab: AddStatsTab) {
    document.querySelectorAll<HTMLButtonElement>('.add-stats-tab').forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === tab)
    })

    setStatus('')
  }

  async function getSeasonOptions(dynastyId: string) {
    if (!dynastyId) {
      return '<option value="">No dynasty selected</option>'
    }

    const { data, error } = await supabase
      .from('seasons')
      .select('id, year')
      .eq('dynasty_id', dynastyId)
      .order('year', { ascending: false })

    if (error) {
      return `<option value="">${error.message}</option>`
    }

    if (!data || data.length === 0) {
      return '<option value="">No seasons yet</option>'
    }

    return data
      .map((season) => `<option value="${season.id}">${season.year} Season</option>`)
      .join('')
  }

  async function renderGameForm() {
    setActiveTab('game')

    const firstDynastyId = dynasties[0]?.id ?? ''
    const seasonOptions = await getSeasonOptions(firstDynastyId)

    formArea.innerHTML = `
        <form id="game-form" class="add-stats-form">
            <label>
            Dynasty
            <select id="game-dynasty-id" required>
                ${dynastyOptions}
            </select>
            </label>

            <label>
            Season
            <select id="game-season-id" required>
                ${seasonOptions}
            </select>
            </label>

            <div class="form-grid">
            <label>
                Home Team
                <input id="home-team" type="text" placeholder="USC" required />
            </label>

            <label>
                Away Team
                <input id="away-team" type="text" placeholder="Alabama" required />
            </label>
            </div>

            <div class="form-grid">
            <label>
                Home Score
                <input id="home-score" type="number" placeholder="35" />
            </label>

            <label>
                Away Score
                <input id="away-score" type="number" placeholder="31" />
            </label>
            </div>

            <label>
            Week
            <input id="week" type="number" placeholder="1" />
            </label>

            <label>
            Game Type
            <select id="game-type">
                <option value="regular_season">Regular Season</option>
                <option value="rivalry">Rivalry Game</option>
                <option value="conference_championship">Conference Championship</option>
                <option value="playoff">Playoff Game</option>
                <option value="bowl">Bowl Game</option>
                <option value="national_championship">National Championship</option>
            </select>
            </label>

            <label>
            Notes
            <textarea id="game-notes" rows="4" placeholder="Optional game notes..."></textarea>
            </label>

            <button class="submit-button" type="submit">Submit Game</button>
        </form>
        `

    document.querySelector<HTMLSelectElement>('#game-dynasty-id')?.addEventListener('change', async (event) => {
      const dynastyId = (event.target as HTMLSelectElement).value
      const seasonSelect = document.querySelector<HTMLSelectElement>('#game-season-id')

      if (seasonSelect) {
        seasonSelect.innerHTML = await getSeasonOptions(dynastyId)
      }
    })

    document.querySelector<HTMLFormElement>('#game-form')?.addEventListener('submit', async (event) => {
        event.preventDefault()

        const dynastyId = getSelectValue('#game-dynasty-id')
        const seasonId = getSelectValue('#game-season-id')
        const homeTeam = getInputValue('#home-team')
        const awayTeam = getInputValue('#away-team')
        const homeScore = getNumberValue('#home-score')
        const awayScore = getNumberValue('#away-score')
        const week = getNumberValue('#week')
        const gameType = getSelectValue('#game-type')
        const isRivalry = gameType === 'rivalry'
        const isPlayoff =
        gameType === 'playoff' ||
        gameType === 'bowl' ||
        gameType === 'national_championship'
        const isConferenceChampionship = gameType === 'conference_championship'
        const notes = getTextAreaValue('#game-notes')

        if (!dynastyId || !seasonId || !homeTeam || !awayTeam) {
            setStatus('Please choose a dynasty, choose a season, and enter both teams.', 'error')
            return
        }

        const { error } = await supabase.from('games').insert({
            dynasty_id: dynastyId,
            season_id: seasonId,
            home_team: homeTeam,
            away_team: awayTeam,
            home_score: homeScore,
            away_score: awayScore,
            week,
            is_rivalry: isRivalry,
            is_playoff: isPlayoff,
            is_conference_championship: isConferenceChampionship,
            notes: notes || null
        })

        if (error) {
            setStatus(error.message, 'error')
            return
        }

        setStatus('Game submitted.', 'success')
        await renderGameForm()
    })
  }

  function renderSeasonForm() {
    setActiveTab('season')

    formArea.innerHTML = `
      <form id="season-form" class="add-stats-form">
        <label>
          Dynasty
          <select id="season-dynasty-id" required>
            ${dynastyOptions}
          </select>
        </label>

        <label>
          Year
          <input id="season-year" type="number" placeholder="2026" required />
        </label>

        <label class="form-check">
          <input id="is-current" type="checkbox" />
          Current Season
        </label>

        <button class="submit-button" type="submit">Submit Season</button>
      </form>
    `

    document.querySelector<HTMLFormElement>('#season-form')?.addEventListener('submit', async (event) => {
      event.preventDefault()

      const dynastyId = getSelectValue('#season-dynasty-id')
      const year = getNumberValue('#season-year')
      const isCurrent = getCheckedValue('#is-current')

      if (!dynastyId || year === null) {
        setStatus('Please choose a dynasty and enter a year.', 'error')
        return
      }

      const { error } = await supabase.from('seasons').insert({
        dynasty_id: dynastyId,
        year,
        is_current: isCurrent
      })

      if (error) {
        setStatus(error.message, 'error')
        return
      }

      setStatus('Season created.', 'success')
      renderSeasonForm()
    })
  }

  function renderTeamForm() {
    setActiveTab('team')

    formArea.innerHTML = `
      <form id="team-form" class="add-stats-form">
        <label>
          Dynasty
          <select id="team-dynasty-id" required>
            ${dynastyOptions}
          </select>
        </label>

        <label>
          Team Name
          <input id="team-name" type="text" placeholder="USC" required />
        </label>

        <label>
          Conference
          <input id="team-conference" type="text" placeholder="Big Ten" />
        </label>

        <label>
          Logo URL
          <input id="team-logo-url" type="url" placeholder="https://example.com/logo.png" />
        </label>

        <button class="submit-button" type="submit">Submit Team</button>
      </form>
    `

    document.querySelector<HTMLFormElement>('#team-form')?.addEventListener('submit', async (event) => {
      event.preventDefault()

      const dynastyId = getSelectValue('#team-dynasty-id')
      const name = getInputValue('#team-name')
      const conference = getInputValue('#team-conference')
      const logoUrl = getInputValue('#team-logo-url')

      if (!dynastyId || !name) {
        setStatus('Please choose a dynasty and enter a team name.', 'error')
        return
      }

      const { error } = await supabase.from('teams').insert({
        dynasty_id: dynastyId,
        name,
        conference: conference || null,
        logo_url: logoUrl || null
      })

      if (error) {
        setStatus(error.message, 'error')
        return
      }

      setStatus('Team added.', 'success')
      renderTeamForm()
    })
  }

  async function renderTrophyForm() {
    setActiveTab('trophy')

    const firstDynastyId = dynasties[0]?.id ?? ''
    const seasonOptions = await getSeasonOptions(firstDynastyId)

    formArea.innerHTML = `
      <form id="trophy-form" class="add-stats-form">
        <label>
          Dynasty
          <select id="trophy-dynasty-id" required>
            ${dynastyOptions}
          </select>
        </label>

        <label>
          Season
          <select id="trophy-season-id" required>
            ${seasonOptions}
          </select>
        </label>

        <label>
          Winning Team
          <input id="trophy-team" type="text" placeholder="USC" required />
        </label>

        <label>
          Trophy Type
          <select id="trophy-type" required>
            <option value="national_championship">National Championship</option>
            <option value="conference_championship">Conference Championship</option>
            <option value="bowl">Bowl Trophy</option>
            <option value="playoff">Playoff</option>
            <option value="rivalry">Rivalry Trophy</option>
            <option value="award">Award</option>
          </select>
        </label>

        <label>
          Trophy Name
          <input id="trophy-name" type="text" placeholder="National Championship" />
        </label>

        <button class="submit-button" type="submit">Submit Trophy</button>
      </form>
    `

    document.querySelector<HTMLSelectElement>('#trophy-dynasty-id')?.addEventListener('change', async (event) => {
      const dynastyId = (event.target as HTMLSelectElement).value
      const seasonSelect = document.querySelector<HTMLSelectElement>('#trophy-season-id')

      if (seasonSelect) {
        seasonSelect.innerHTML = await getSeasonOptions(dynastyId)
      }
    })

    document.querySelector<HTMLFormElement>('#trophy-form')?.addEventListener('submit', async (event) => {
      event.preventDefault()

      const dynastyId = getSelectValue('#trophy-dynasty-id')
      const seasonId = getSelectValue('#trophy-season-id')
      const team = getInputValue('#trophy-team')
      const trophyType = getSelectValue('#trophy-type')
      const trophyName = getInputValue('#trophy-name')

      if (!dynastyId || !seasonId || !team || !trophyType) {
        setStatus('Please choose a dynasty, choose a season, enter a winning team, and choose a trophy type.', 'error')
        return
      }

      const { error } = await supabase.from('trophies').insert({
        dynasty_id: dynastyId,
        season_id: seasonId,
        team,
        trophy_type: trophyType,
        trophy_name: trophyName || null
      })

      if (error) {
        setStatus(error.message, 'error')
        return
      }

      setStatus('Trophy awarded.', 'success')
      await renderTrophyForm()
    })
  }

  document.querySelectorAll<HTMLButtonElement>('.add-stats-tab').forEach((button) => {
    button.addEventListener('click', async () => {
      const tab = button.dataset.tab as AddStatsTab

      if (tab === 'game') await renderGameForm()
      if (tab === 'season') renderSeasonForm()
      if (tab === 'team') renderTeamForm()
      if (tab === 'trophy') await renderTrophyForm()
    })
  })

  await renderGameForm()
}

function buildDynastyOptions(dynasties: Dynasty[]) {
  if (!dynasties.length) {
    return '<option value="">No dynasties found</option>'
  }

  return dynasties
    .map((dynasty) => `<option value="${dynasty.id}">${dynasty.name}</option>`)
    .join('')
}

function getInputValue(selector: string) {
  return document.querySelector<HTMLInputElement>(selector)?.value.trim() ?? ''
}

function getTextAreaValue(selector: string) {
  return document.querySelector<HTMLTextAreaElement>(selector)?.value.trim() ?? ''
}

function getSelectValue(selector: string) {
  return document.querySelector<HTMLSelectElement>(selector)?.value ?? ''
}

function getNumberValue(selector: string) {
  const value = document.querySelector<HTMLInputElement>(selector)?.value

  if (value === undefined || value === '') {
    return null
  }

  return Number(value)
}

function getCheckedValue(selector: string) {
  return document.querySelector<HTMLInputElement>(selector)?.checked ?? false
}