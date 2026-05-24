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
    console.error('Could not find #app container')
    return
  }

  app.innerHTML = pageHtml

  const formArea = document.querySelector<HTMLDivElement>('#form-area')
  const statusMessage = document.querySelector<HTMLParagraphElement>('#status-message')

  if (!formArea || !statusMessage) {
    console.error('Add Stats page is missing #form-area or #status-message')
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

  function renderGameForm() {
    setActiveTab('game')

    formArea.innerHTML = `
      <form id="game-form" class="add-stats-form">
        <label>
          Dynasty
          <select id="game-dynasty-id" required>
            ${dynastyOptions}
          </select>
        </label>

        <label>
          Season Year
          <input id="game-season-year" type="number" placeholder="2026" required />
        </label>

        <label>
          Week
          <input id="game-week" type="number" placeholder="1" />
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
            <input id="home-score" type="number" placeholder="35" required />
          </label>

          <label>
            Away Score
            <input id="away-score" type="number" placeholder="31" required />
          </label>
        </div>

        <label>
          Game Type
          <select id="game-type">
            <option value="regular">Regular Season</option>
            <option value="conference_championship">Conference Championship</option>
            <option value="playoff">Playoff</option>
            <option value="bowl">Bowl Game</option>
            <option value="national_championship">National Championship</option>
          </select>
        </label>

        <label>
          Notes
          <textarea id="game-notes" rows="4" placeholder="Big comeback, upset win, rivalry chaos..."></textarea>
        </label>

        <button class="submit-button" type="submit">Save Game Result</button>
      </form>
    `

    document.querySelector<HTMLFormElement>('#game-form')?.addEventListener('submit', async (event) => {
      event.preventDefault()

      const dynastyId = getSelectValue('#game-dynasty-id')
      const seasonYear = getNumberValue('#game-season-year')
      const week = getNumberValue('#game-week')
      const homeTeam = getInputValue('#home-team')
      const awayTeam = getInputValue('#away-team')
      const homeScore = getNumberValue('#home-score')
      const awayScore = getNumberValue('#away-score')
      const gameType = getSelectValue('#game-type')
      const notes = getTextAreaValue('#game-notes')

      if (!dynastyId || !seasonYear || !homeTeam || !awayTeam || homeScore === null || awayScore === null) {
        setStatus('Please fill out all required game fields.', 'error')
        return
      }

      const { error } = await supabase.from('games').insert({
        dynasty_id: dynastyId,
        season_year: seasonYear,
        week,
        home_team: homeTeam,
        away_team: awayTeam,
        home_score: homeScore,
        away_score: awayScore,
        game_type: gameType,
        notes
      })

      if (error) {
        setStatus(error.message, 'error')
        return
      }

      setStatus('Game result saved.', 'success')
      renderGameForm()
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
          Season Year
          <input id="season-year" type="number" placeholder="2026" required />
        </label>

        <div class="form-grid">
          <label>
            Wins
            <input id="season-wins" type="number" placeholder="12" />
          </label>

          <label>
            Losses
            <input id="season-losses" type="number" placeholder="1" />
          </label>
        </div>

        <label>
          Result
          <select id="season-result">
            <option value="">Select result</option>
            <option value="in_progress">In Progress</option>
            <option value="regular_season">Regular Season Finished</option>
            <option value="conference_champion">Conference Champion</option>
            <option value="playoff_appearance">Playoff Appearance</option>
            <option value="national_runner_up">National Runner-Up</option>
            <option value="national_champion">National Champion</option>
          </select>
        </label>

        <label>
          Notes
          <textarea id="season-notes" rows="4" placeholder="Season summary, playoff run, coach notes..."></textarea>
        </label>

        <button class="submit-button" type="submit">Save Season</button>
      </form>
    `

    document.querySelector<HTMLFormElement>('#season-form')?.addEventListener('submit', async (event) => {
      event.preventDefault()

      const dynastyId = getSelectValue('#season-dynasty-id')
      const year = getNumberValue('#season-year')
      const wins = getNumberValue('#season-wins')
      const losses = getNumberValue('#season-losses')
      const result = getSelectValue('#season-result')
      const notes = getTextAreaValue('#season-notes')

      if (!dynastyId || !year) {
        setStatus('Please choose a dynasty and enter a season year.', 'error')
        return
      }

      const { error } = await supabase.from('seasons').insert({
        dynasty_id: dynastyId,
        year,
        wins,
        losses,
        result,
        notes
      })

      if (error) {
        setStatus(error.message, 'error')
        return
      }

      setStatus('Season saved.', 'success')
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

        <div class="form-grid">
          <label>
            Wins
            <input id="team-wins" type="number" placeholder="12" />
          </label>

          <label>
            Losses
            <input id="team-losses" type="number" placeholder="1" />
          </label>
        </div>

        <label>
          Logo URL
          <input id="team-logo-url" type="url" placeholder="https://example.com/logo.png" />
        </label>

        <button class="submit-button" type="submit">Save Team</button>
      </form>
    `

    document.querySelector<HTMLFormElement>('#team-form')?.addEventListener('submit', async (event) => {
      event.preventDefault()

      const dynastyId = getSelectValue('#team-dynasty-id')
      const name = getInputValue('#team-name')
      const conference = getInputValue('#team-conference')
      const wins = getNumberValue('#team-wins')
      const losses = getNumberValue('#team-losses')
      const logoUrl = getInputValue('#team-logo-url')

      if (!dynastyId || !name) {
        setStatus('Please choose a dynasty and enter a team name.', 'error')
        return
      }

      const { error } = await supabase.from('teams').insert({
        dynasty_id: dynastyId,
        name,
        conference,
        wins,
        losses,
        logo_url: logoUrl
      })

      if (error) {
        setStatus(error.message, 'error')
        return
      }

      setStatus('Team saved.', 'success')
      renderTeamForm()
    })
  }

  function renderTrophyForm() {
    setActiveTab('trophy')

    formArea.innerHTML = `
      <form id="trophy-form" class="add-stats-form">
        <label>
          Dynasty
          <select id="trophy-dynasty-id" required>
            ${dynastyOptions}
          </select>
        </label>

        <label>
          Trophy Name
          <input id="trophy-name" type="text" placeholder="National Championship" required />
        </label>

        <label>
          Winning Team
          <input id="trophy-team" type="text" placeholder="USC" required />
        </label>

        <label>
          Season Year
          <input id="trophy-season-year" type="number" placeholder="2026" />
        </label>

        <label>
          Trophy Type
          <select id="trophy-type">
            <option value="national_championship">National Championship</option>
            <option value="conference_championship">Conference Championship</option>
            <option value="bowl">Bowl</option>
            <option value="rivalry">Rivalry</option>
            <option value="award">Award</option>
          </select>
        </label>

        <label>
          Notes
          <textarea id="trophy-notes" rows="4" placeholder="Who they beat, score, storylines..."></textarea>
        </label>

        <button class="submit-button" type="submit">Save Trophy</button>
      </form>
    `

    document.querySelector<HTMLFormElement>('#trophy-form')?.addEventListener('submit', async (event) => {
      event.preventDefault()

      const dynastyId = getSelectValue('#trophy-dynasty-id')
      const name = getInputValue('#trophy-name')
      const team = getInputValue('#trophy-team')
      const seasonYear = getNumberValue('#trophy-season-year')
      const trophyType = getSelectValue('#trophy-type')
      const notes = getTextAreaValue('#trophy-notes')

      if (!dynastyId || !name || !team) {
        setStatus('Please choose a dynasty, enter a trophy name, and enter the winning team.', 'error')
        return
      }

      const { error } = await supabase.from('trophies').insert({
        dynasty_id: dynastyId,
        name,
        team,
        season_year: seasonYear,
        trophy_type: trophyType,
        notes
      })

      if (error) {
        setStatus(error.message, 'error')
        return
      }

      setStatus('Trophy saved.', 'success')
      renderTrophyForm()
    })
  }

  document.querySelectorAll<HTMLButtonElement>('.add-stats-tab').forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab as AddStatsTab

      if (tab === 'game') renderGameForm()
      if (tab === 'season') renderSeasonForm()
      if (tab === 'team') renderTeamForm()
      if (tab === 'trophy') renderTrophyForm()
    })
  })

  renderGameForm()
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