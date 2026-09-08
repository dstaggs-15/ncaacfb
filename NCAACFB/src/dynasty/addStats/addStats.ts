import '../../style.css'
import './addStats.css'
import pageHtml from './addStats.html?raw'
import { supabase } from '../../supabase'
import { getAllDynasties } from '../dynastyData'

type Dynasty = {
  id: string
  name: string
}

type Profile = {
  id: string
  username: string | null
  display_name: string | null
}

type Team = {
  id: string
  name: string
}

type Season = {
  id: string
  year: number
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
      return '<option value="">Choose a season</option>'
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

    const seasonOptions = await getSeasonOptions('')

    formArea.innerHTML = `
      <div class="csv-upload-section">
        <div class="csv-upload-actions">
          <a id="download-template-btn" class="csv-action-button" href="/game_results_template.csv" download>
            ↓ Download Template
          </a>
          <label class="csv-action-button csv-file-label" for="csv-file-input">
            ↑ Upload CSV
          </label>
          <input id="csv-file-input" type="file" accept=".csv" style="display:none" />
        </div>

        <div id="csv-progress" class="csv-progress" style="display:none">
          <div class="csv-progress-bar">
            <div id="csv-progress-fill" class="csv-progress-fill" style="width:0%"></div>
          </div>
          <p id="csv-progress-text" class="csv-progress-text">Processing...</p>
        </div>
      </div>

      <form id="game-form" class="add-stats-form">
        <label>
          Dynasty
          <select id="game-dynasty-id" required>
            ${dynastyOptions}
          </select>
        </label>

        <label>
          Season
          <select id="game-season-id" required disabled>
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
          <select id="week">
            ${buildWeekOptions()}
          </select>
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
        seasonSelect.disabled = !dynastyId
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
      const week = getWeekValue('#week')
      const gameType = getSelectValue('#game-type')
      const notes = getTextAreaValue('#game-notes')

      if (!dynastyId || !seasonId || !homeTeam || !awayTeam) {
        setStatus('Please choose a dynasty, choose a season, and enter both teams.', 'error')
        return
      }

      const gameInfo = getGameTypeInfo(gameType, week)

      const { error } = await supabase.from('games').insert({
        dynasty_id: dynastyId,
        season_id: seasonId,
        home_team: homeTeam,
        away_team: awayTeam,
        home_score: homeScore,
        away_score: awayScore,
        week: gameInfo.week,
        week_label: gameInfo.weekLabel,
        sort_order: gameInfo.sortOrder,
        game_type: gameInfo.gameType,
        is_rivalry: gameInfo.isRivalry,
        is_playoff: gameInfo.isPlayoff,
        is_conference_championship: gameInfo.isConferenceChampionship,
        notes: notes || null
      })

      if (error) {
        setStatus(error.message, 'error')
        return
      }

      setStatus('Game submitted.', 'success')
      clearGameFields()
    })

    document.querySelector<HTMLInputElement>('#csv-file-input')?.addEventListener('change', async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return

      const text = await file.text()
      const rows = parseCSV(text)

      if (rows.length === 0) {
        setStatus('No data rows found in CSV.', 'error')
        return
      }

      const progressEl = document.querySelector<HTMLDivElement>('#csv-progress')
      const progressFill = document.querySelector<HTMLDivElement>('#csv-progress-fill')
      const progressText = document.querySelector<HTMLParagraphElement>('#csv-progress-text')

      if (progressEl) progressEl.style.display = 'block'

      setStatus('Reading CSV...', 'neutral')

      /*
       * Load profiles once.
       */
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name')

      if (profileError) {
        setStatus(`Could not load profiles: ${profileError.message}`, 'error')
        return
      }

      const profiles = (profileData ?? []) as Profile[]

      /*
       * Cache seasons, teams, and existing games so we don't repeatedly
       * query Supabase for the same information.
       */
      const seasonCache = new Map<string, Season>()
      const teamCache = new Map<string, Team>()
      const existingGameKeys = new Set<string>()

      /*
       * Load all existing games for the dynasties in this CSV.
       * This prevents accidentally adding the same game twice if a CSV
       * is uploaded again.
       */
      const dynastyNamesInCSV = new Set(
        rows
          .map(row => (row['dynasty_name'] ?? '').trim().toLowerCase())
          .filter(Boolean)
      )

      for (const dynasty of dynasties) {
        if (!dynastyNamesInCSV.has(dynasty.name.toLowerCase())) continue

        const { data: existingGames, error: existingGamesError } = await supabase
          .from('games')
          .select('season_id, home_team, away_team, home_score, away_score, week, game_type, week_label')
          .eq('dynasty_id', dynasty.id)

        if (existingGamesError) {
          console.warn(`Could not load existing games for ${dynasty.name}:`, existingGamesError.message)
          continue
        }

        for (const game of existingGames ?? []) {
          existingGameKeys.add(
            createGameKey(
              game.season_id,
              game.home_team,
              game.away_team,
              game.home_score,
              game.away_score,
              game.week,
              game.game_type,
              game.week_label
            )
          )
        }
      }

      let succeeded = 0
      let skipped = 0
      let failed = 0

      const errors: string[] = []

      /*
       * Process each CSV row.
       */
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]

        if (progressFill) {
          progressFill.style.width = `${Math.round((i / rows.length) * 100)}%`
        }

        if (progressText) {
          progressText.textContent = `Processing row ${i + 1} of ${rows.length}…`
        }

        const dynastyName = cleanCSVValue(row['dynasty_name'])
        const seasonYear = cleanCSVValue(row['season_year'])
        const homeTeam = cleanCSVValue(row['home_team'])
        const awayTeam = cleanCSVValue(row['away_team'])
        const homeScoreRaw = cleanCSVValue(row['home_score'])
        const awayScoreRaw = cleanCSVValue(row['away_score'])
        const gameTypeRaw = cleanCSVValue(row['game_type'])
        const weekRaw = cleanCSVValue(row['week'])

        /*
         * NEW:
         * These are the people controlling each team.
         *
         * Examples:
         * Daniel
         * Tucker
         * Cam
         *
         * Or their email addresses.
         */
        const homeUser = cleanCSVValue(row['home_user'])
        const awayUser = cleanCSVValue(row['away_user'])

        if (!dynastyName || !seasonYear || !homeTeam || !awayTeam) {
          failed++
          errors.push(`Row ${i + 1}: Missing dynasty, season, home team, or away team.`)
          continue
        }

        const dynasty = dynasties.find(
          d => d.name.toLowerCase() === dynastyName.toLowerCase()
        )

        if (!dynasty) {
          failed++
          errors.push(`Row ${i + 1}: Dynasty "${dynastyName}" not found.`)
          continue
        }

        const yearNumber = Number(seasonYear)

        if (!Number.isFinite(yearNumber)) {
          failed++
          errors.push(`Row ${i + 1}: Invalid season year "${seasonYear}".`)
          continue
        }

        /*
         * Find season.
         */
        const seasonCacheKey = `${dynasty.id}:${yearNumber}`

        let season = seasonCache.get(seasonCacheKey)

        if (!season) {
          const { data: seasonData, error: seasonError } = await supabase
            .from('seasons')
            .select('id, year')
            .eq('dynasty_id', dynasty.id)
            .eq('year', yearNumber)
            .single()

          if (seasonError || !seasonData) {
            failed++
            errors.push(
              `Row ${i + 1}: Season ${yearNumber} not found for "${dynastyName}".`
            )
            continue
          }

          season = seasonData as Season
          seasonCache.set(seasonCacheKey, season)
        }

        /*
         * Find or create the home team.
         */
        const homeTeamKey = `${dynasty.id}:${homeTeam.toLowerCase()}`

        let homeTeamData = teamCache.get(homeTeamKey)

        if (!homeTeamData) {
          const { data: foundHomeTeam, error: homeTeamError } = await supabase
            .from('teams')
            .select('id, name')
            .eq('dynasty_id', dynasty.id)
            .ilike('name', homeTeam)
            .maybeSingle()

          if (homeTeamError) {
            failed++
            errors.push(
              `Row ${i + 1}: Could not find home team "${homeTeam}": ${homeTeamError.message}`
            )
            continue
          }

          if (foundHomeTeam) {
            homeTeamData = foundHomeTeam as Team
          } else {
            const { data: newHomeTeam, error: createHomeTeamError } = await supabase
              .from('teams')
              .insert({
                dynasty_id: dynasty.id,
                name: homeTeam
              })
              .select('id, name')
              .single()

            if (createHomeTeamError || !newHomeTeam) {
              failed++
              errors.push(
                `Row ${i + 1}: Could not create home team "${homeTeam}": ${createHomeTeamError?.message ?? 'Unknown error'}`
              )
              continue
            }

            homeTeamData = newHomeTeam as Team
          }

          teamCache.set(homeTeamKey, homeTeamData)
        }

        /*
         * Find or create the away team.
         */
        const awayTeamKey = `${dynasty.id}:${awayTeam.toLowerCase()}`

        let awayTeamData = teamCache.get(awayTeamKey)

        if (!awayTeamData) {
          const { data: foundAwayTeam, error: awayTeamError } = await supabase
            .from('teams')
            .select('id, name')
            .eq('dynasty_id', dynasty.id)
            .ilike('name', awayTeam)
            .maybeSingle()

          if (awayTeamError) {
            failed++
            errors.push(
              `Row ${i + 1}: Could not find away team "${awayTeam}": ${awayTeamError.message}`
            )
            continue
          }

          if (foundAwayTeam) {
            awayTeamData = foundAwayTeam as Team
          } else {
            const { data: newAwayTeam, error: createAwayTeamError } = await supabase
              .from('teams')
              .insert({
                dynasty_id: dynasty.id,
                name: awayTeam
              })
              .select('id, name')
              .single()

            if (createAwayTeamError || !newAwayTeam) {
              failed++
              errors.push(
                `Row ${i + 1}: Could not create away team "${awayTeam}": ${createAwayTeamError?.message ?? 'Unknown error'}`
              )
              continue
            }

            awayTeamData = newAwayTeam as Team
          }

          teamCache.set(awayTeamKey, awayTeamData)
        }

        /*
         * Resolve users.
         */
        const homeProfile = findProfile(homeUser, profiles)
        const awayProfile = findProfile(awayUser, profiles)

        if (homeUser && !homeProfile) {
          failed++
          errors.push(
            `Row ${i + 1}: Could not find home user "${homeUser}".`
          )
          continue
        }

        if (awayUser && !awayProfile) {
          failed++
          errors.push(
            `Row ${i + 1}: Could not find away user "${awayUser}".`
          )
          continue
        }

        /*
         * IMPORTANT:
         *
         * Every team appearing in the CSV gets a season-specific
         * control assignment.
         *
         * If home_user/away_user contains a person:
         *     control_type = user
         *
         * If blank:
         *     control_type = cpu
         *
         * That means the CSV itself completely defines who controls
         * each team for that season.
         */
        const homeControlError = await upsertSeasonTeamControl(
          season.id,
          homeTeamData.id,
          homeProfile?.id ?? null
        )

        if (homeControlError) {
          failed++
          errors.push(
            `Row ${i + 1}: Could not assign ${homeTeam} to ${homeUser || 'CPU'}: ${homeControlError}`
          )
          continue
        }

        const awayControlError = await upsertSeasonTeamControl(
          season.id,
          awayTeamData.id,
          awayProfile?.id ?? null
        )

        if (awayControlError) {
          failed++
          errors.push(
            `Row ${i + 1}: Could not assign ${awayTeam} to ${awayUser || 'CPU'}: ${awayControlError}`
          )
          continue
        }

        /*
         * Parse the game.
         */
        const gameInfo = getGameTypeInfoFromCSV(gameTypeRaw, weekRaw)

        const homeScore =
          homeScoreRaw === '' ? null : Number(homeScoreRaw)

        const awayScore =
          awayScoreRaw === '' ? null : Number(awayScoreRaw)

        if (
          homeScoreRaw !== '' &&
          !Number.isFinite(homeScore)
        ) {
          failed++
          errors.push(`Row ${i + 1}: Invalid home score "${homeScoreRaw}".`)
          continue
        }

        if (
          awayScoreRaw !== '' &&
          !Number.isFinite(awayScore)
        ) {
          failed++
          errors.push(`Row ${i + 1}: Invalid away score "${awayScoreRaw}".`)
          continue
        }

        /*
         * Prevent duplicate games when uploading the same CSV again.
         */
        const gameKey = createGameKey(
          season.id,
          homeTeam,
          awayTeam,
          homeScore,
          awayScore,
          gameInfo.week,
          gameInfo.gameType,
          gameInfo.weekLabel
        )

        if (existingGameKeys.has(gameKey)) {
          skipped++
          continue
        }

        const { error: insertError } = await supabase.from('games').insert({
          dynasty_id: dynasty.id,
          season_id: season.id,
          home_team: homeTeam,
          away_team: awayTeam,
          home_score: homeScore,
          away_score: awayScore,
          week: gameInfo.week,
          week_label: gameInfo.weekLabel,
          sort_order: gameInfo.sortOrder,
          game_type: gameInfo.gameType,
          is_rivalry: gameInfo.isRivalry,
          is_playoff: gameInfo.isPlayoff,
          is_conference_championship: gameInfo.isConferenceChampionship,
          notes: null
        })

        if (insertError) {
          failed++
          errors.push(`Row ${i + 1}: ${insertError.message}`)
        } else {
          succeeded++
          existingGameKeys.add(gameKey)
        }
      }

      if (progressFill) {
        progressFill.style.width = '100%'
      }

      if (progressText) {
        progressText.textContent = 'Done'
      }

      const type =
        failed === 0
          ? 'success'
          : succeeded > 0
            ? 'neutral'
            : 'error'

      const summary =
        `${succeeded} game${succeeded !== 1 ? 's' : ''} added` +
        `${skipped > 0 ? `, ${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped` : ''}` +
        `${failed > 0 ? `, ${failed} failed` : ''}.`

      setStatus(
        summary +
        (errors.length > 0
          ? ' Check the browser console for row details.'
          : ''),
        type
      )

      if (errors.length > 0) {
        console.warn('CSV upload errors:', errors)
      }

      ;(event.target as HTMLInputElement).value = ''
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

        <label class="form-check form-check-row">
          <span>Current Season</span>
          <input id="is-current" type="checkbox" />
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

      if (isCurrent) {
        const { error: updateError } = await supabase
          .from('seasons')
          .update({ is_current: false })
          .eq('dynasty_id', dynastyId)

        if (updateError) {
          setStatus(updateError.message, 'error')
          return
        }
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

    const seasonOptions = await getSeasonOptions('')

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
          <select id="trophy-season-id" required disabled>
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
        seasonSelect.disabled = !dynastyId
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
        setStatus(
          'Please choose a dynasty, choose a season, enter a winning team, and choose a trophy type.',
          'error'
        )
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

/* ============================================================
   CSV / GAME HELPERS
   ============================================================ */

function buildDynastyOptions(dynasties: Dynasty[]) {
  if (!dynasties.length) {
    return '<option value="">No dynasties found</option>'
  }

  return `
    <option value="">Choose a dynasty</option>
    ${dynasties
      .map((dynasty) => `<option value="${dynasty.id}">${dynasty.name}</option>`)
      .join('')}
  `
}

function buildWeekOptions() {
  const weekOptions = Array.from({ length: 16 }, (_, index) => {
    const selected = index === 1 ? ' selected' : ''

    return `<option value="${index}"${selected}>Week ${index}</option>`
  }).join('')

  return `
    ${weekOptions}
    <option value="">Post-Season</option>
  `
}

function getGameTypeInfo(
  gameType: string,
  week: number | null
) {
  const normalized = normalizeGameType(gameType)

  let weekLabel: string | null = null
  let sortOrder = 0

  if (week !== null) {
    weekLabel = `Week ${week}`
    sortOrder = week
  } else {
    weekLabel = 'Post-Season'
    sortOrder = 17
  }

  return {
    gameType: normalized,
    week,
    weekLabel,
    sortOrder,
    isRivalry: normalized === 'rivalry',
    isPlayoff:
      normalized === 'playoff' ||
      normalized === 'bowl' ||
      normalized === 'national_championship',
    isConferenceChampionship:
      normalized === 'conference_championship'
  }
}

function getGameTypeInfoFromCSV(
  gameTypeRaw: string,
  weekRaw: string
) {
  const normalizedType = normalizeGameType(gameTypeRaw)

  const weekNumber =
    weekRaw !== '' && /^\d+$/.test(weekRaw)
      ? Number(weekRaw)
      : null

  let week: number | null = weekNumber
  let weekLabel: string | null = null
  let sortOrder = weekNumber ?? 17

  /*
   * Regular season:
   * week = actual week number
   */
  if (
    normalizedType === 'regular_season' ||
    normalizedType === 'rivalry'
  ) {
    if (weekNumber !== null) {
      weekLabel = `Week ${weekNumber}`
      sortOrder = weekNumber
    } else {
      weekLabel = 'Regular Season'
      sortOrder = 0
    }
  }

  /*
   * Conference Championship
   */
  else if (normalizedType === 'conference_championship') {
    week = null
    weekLabel = 'Conf Champ'
    sortOrder = 17
  }

  /*
   * Bowl
   */
  else if (normalizedType === 'bowl') {
    week = null

    const bowlNumber = extractNumber(
      weekRaw,
      'bowl'
    )

    weekLabel =
      bowlNumber !== null
        ? `Bowl ${bowlNumber}`
        : 'Bowl'

    sortOrder =
      bowlNumber !== null
        ? 17 + bowlNumber
        : 18
  }

  /*
   * Playoff
   */
  else if (normalizedType === 'playoff') {
    week = null

    const playoffNumber = extractNumber(
      weekRaw,
      'playoff'
    )

    weekLabel =
      playoffNumber !== null
        ? `Playoff ${playoffNumber}`
        : 'Playoff'

    sortOrder =
      playoffNumber !== null
        ? 20 + playoffNumber
        : 20
  }

  /*
   * National Championship
   */
  else if (normalizedType === 'national_championship') {
    week = null
    weekLabel = "Nat'l Champ"
    sortOrder = 30
  }

  else {
    week = weekNumber
    weekLabel =
      weekNumber !== null
        ? `Week ${weekNumber}`
        : null

    sortOrder = weekNumber ?? 0
  }

  return {
    gameType: normalizedType,
    week,
    weekLabel,
    sortOrder,
    isRivalry: normalizedType === 'rivalry',
    isPlayoff:
      normalizedType === 'playoff' ||
      normalizedType === 'bowl' ||
      normalizedType === 'national_championship',
    isConferenceChampionship:
      normalizedType === 'conference_championship'
  }
}

function normalizeGameType(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')

  if (
    normalized === 'regular season' ||
    normalized === 'regular'
  ) {
    return 'regular_season'
  }

  if (
    normalized === 'rivalry' ||
    normalized === 'rivalry game'
  ) {
    return 'rivalry'
  }

  if (
    normalized === 'conference championship' ||
    normalized === 'conference championship game' ||
    normalized === 'conf champ'
  ) {
    return 'conference_championship'
  }

  if (
    normalized === 'playoff' ||
    normalized === 'playoff game'
  ) {
    return 'playoff'
  }

  if (
    normalized === 'bowl' ||
    normalized === 'bowl game'
  ) {
    return 'bowl'
  }

  if (
    normalized === 'national championship' ||
    normalized === 'national championship game' ||
    normalized === 'natl champ' ||
    normalized === "nat'l champ"
  ) {
    return 'national_championship'
  }

  /*
   * If someone uses the database-style value already,
   * keep it.
   */
  if (normalized === 'regular_season') {
    return 'regular_season'
  }

  if (normalized === 'conference_championship') {
    return 'conference_championship'
  }

  if (normalized === 'national_championship') {
    return 'national_championship'
  }

  return 'regular_season'
}

function extractNumber(
  value: string,
  keyword: string
): number | null {
  const match = value
    .toLowerCase()
    .match(new RegExp(`${keyword}\\s*(\\d+)`))

  if (!match) {
    return null
  }

  return Number(match[1])
}

function cleanCSVValue(value: string | undefined): string {
  return (value ?? '').trim()
}

/* ============================================================
   PROFILE / USER ASSIGNMENT
   ============================================================ */

function findProfile(
  value: string,
  profiles: Profile[]
): Profile | null {
  const search = value.trim().toLowerCase()

  if (!search) {
    return null
  }

  /*
   * Match email / username first.
   */
  const exactUsername = profiles.find(profile =>
    (profile.username ?? '').trim().toLowerCase() === search
  )

  if (exactUsername) {
    return exactUsername
  }

  /*
   * Match display name.
   */
  const exactDisplayName = profiles.find(profile =>
    (profile.display_name ?? '').trim().toLowerCase() === search
  )

  if (exactDisplayName) {
    return exactDisplayName
  }

  /*
   * Also allow common names such as:
   * Daniel
   * Tucker
   * Cam
   */
  const normalizedSearch = normalizePersonName(search)

  const nameMatches = profiles.filter(profile => {
    const username = normalizePersonName(profile.username ?? '')
    const displayName = normalizePersonName(profile.display_name ?? '')

    return (
      username === normalizedSearch ||
      displayName === normalizedSearch
    )
  })

  if (nameMatches.length === 1) {
    return nameMatches[0]
  }

  /*
   * Last resort: partial display-name match,
   * but only if it produces exactly one result.
   */
  const partialMatches = profiles.filter(profile => {
    const displayName = (profile.display_name ?? '').trim().toLowerCase()

    return (
      displayName &&
      (
        displayName.includes(search) ||
        search.includes(displayName)
      )
    )
  })

  if (partialMatches.length === 1) {
    return partialMatches[0]
  }

  return null
}

function normalizePersonName(value: string): string {
  return value
    .toLowerCase()
    .replace(/@.*$/, '')
    .replace(/[^a-z0-9]/g, '')
}

/* ============================================================
   SEASON TEAM CONTROL
   ============================================================ */

async function upsertSeasonTeamControl(
  seasonId: string,
  teamId: string,
  profileId: string | null
): Promise<string | null> {
  const { error } = await supabase
    .from('season_team_control')
    .upsert(
      {
        season_id: seasonId,
        team_id: teamId,
        profile_id: profileId,
        control_type: profileId ? 'user' : 'cpu'
      },
      {
        onConflict: 'season_id,team_id'
      }
    )

  if (error) {
    return error.message
  }

  return null
}

/* ============================================================
   DUPLICATE GAME PROTECTION
   ============================================================ */

function createGameKey(
  seasonId: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number | null,
  awayScore: number | null,
  week: number | null,
  gameType: string | null,
  weekLabel: string | null
): string {
  return [
    seasonId,
    homeTeam.trim().toLowerCase(),
    awayTeam.trim().toLowerCase(),
    homeScore ?? '',
    awayScore ?? '',
    week ?? '',
    (gameType ?? '').trim().toLowerCase(),
    (weekLabel ?? '').trim().toLowerCase()
  ].join('|')
}

/* ============================================================
   FORM HELPERS
   ============================================================ */

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

function getWeekValue(selector: string) {
  const value = document.querySelector<HTMLSelectElement>(selector)?.value

  if (value === undefined || value === '') {
    return null
  }

  return Number(value)
}

function getCheckedValue(selector: string) {
  return document.querySelector<HTMLInputElement>(selector)?.checked ?? false
}

function clearGameFields() {
  setInputValue('#home-team', '')
  setInputValue('#away-team', '')
  setInputValue('#home-score', '')
  setInputValue('#away-score', '')
  setSelectValue('#week', '1')
  setTextAreaValue('#game-notes', '')

  const gameTypeSelect =
    document.querySelector<HTMLSelectElement>('#game-type')

  if (gameTypeSelect) {
    gameTypeSelect.value = 'regular_season'
  }
}

function setInputValue(selector: string, value: string) {
  const input =
    document.querySelector<HTMLInputElement>(selector)

  if (input) {
    input.value = value
  }
}

function setSelectValue(selector: string, value: string) {
  const select =
    document.querySelector<HTMLSelectElement>(selector)

  if (select) {
    select.value = value
  }
}

function setTextAreaValue(selector: string, value: string) {
  const textArea =
    document.querySelector<HTMLTextAreaElement>(selector)

  if (textArea) {
    textArea.value = value
  }
}

/* ============================================================
   CSV PARSER
   ============================================================ */

function parseCSV(text: string): Record<string, string>[] {
  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()

  if (!normalizedText) {
    return []
  }

  const lines = splitCSVLines(normalizedText)

  if (lines.length < 2) {
    return []
  }

  const headers = splitCSVLine(lines[0]).map(header =>
    header.trim().replace(/^"|"$/g, '')
  )

  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue

    const values = splitCSVLine(lines[i])

    if (values.every(value => value.trim() === '')) {
      continue
    }

    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = (values[index] ?? '').trim()
    })

    rows.push(row)
  }

  return rows
}

function splitCSVLines(text: string): string[] {
  const lines: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (char === '"') {
      /*
       * A pair of quotes inside a quoted field represents
       * a literal quote.
       */
      if (
        inQuotes &&
        text[i + 1] === '"'
      ) {
        current += '""'
        i++
        continue
      }

      inQuotes = !inQuotes
      current += char
      continue
    }

    if (char === '\n' && !inQuotes) {
      lines.push(current)
      current = ''
      continue
    }

    current += char
  }

  if (current) {
    lines.push(current)
  }

  return lines
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (
        inQuotes &&
        line[i + 1] === '"'
      ) {
        current += '"'
        i++
        continue
      }

      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }

    current += char
  }

  result.push(current)

  return result
}
