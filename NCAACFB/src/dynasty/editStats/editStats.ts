import '../../style.css'
import './editStats.css'
import pageHtml from './editStats.html?raw'
import { supabase } from '../../supabase'
import { getAllDynasties } from '../dynastyData'

type Dynasty = {
    id: string
    name: string
}

type RecordType = 'game'

type GameRecord = {
    id: string
    dynasty_id: string
    season_id: string
    home_team: string
    away_team: string
    home_score: number | null
    away_score: number | null
    week: number | null
    is_rivalry: boolean | null
    is_playoff: boolean | null
    is_conference_championship: boolean | null
    notes: string | null
    seasons?: {
        year: number
    }[] | null
}

export default async function initEditStatsPage() {
    const app = document.querySelector<HTMLDivElement>('#app')

    if (!app) {
        console.error('Could not find #app container.')
        return
    }

    app.innerHTML = pageHtml

    const dynastySelect = getRequiredElement<HTMLSelectElement>('#edit-dynasty-id')
    const recordTypeSelect = getRequiredElement<HTMLSelectElement>('#edit-record-type')
    const recordsList = getRequiredElement<HTMLDivElement>('#records-list')
    const recordsHelperText = getRequiredElement<HTMLParagraphElement>('#records-helper-text')
    const editorArea = getRequiredElement<HTMLDivElement>('#editor-area')
    const statusMessage = getRequiredElement<HTMLParagraphElement>('#status-message')

    let selectedGameId = ''

    const dynasties = await getAllDynasties() as Dynasty[]
    dynastySelect.innerHTML = buildDynastyOptions(dynasties)

    setStatus('Choose a dynasty to start editing.', 'neutral')

    dynastySelect.addEventListener('change', async () => {
        selectedGameId = ''
        clearEditor()

        const dynastyId = dynastySelect.value

        if (!dynastyId) {
            recordsHelperText.textContent = 'Choose a dynasty to see games.'
            recordsList.className = 'records-list empty-state'
            recordsList.textContent = 'Choose a dynasty to see games.'
            setStatus('Choose a dynasty to start editing.', 'neutral')
            return
        }

        await loadGames(dynastyId)
    })

    recordTypeSelect.addEventListener('change', async () => {
        const recordType = recordTypeSelect.value as RecordType

        if (recordType === 'game' && dynastySelect.value) {
            selectedGameId = ''
            clearEditor()
            await loadGames(dynastySelect.value)
        }
    })

    async function loadGames(dynastyId: string) {
        setStatus('Loading games...', 'neutral')
        recordsHelperText.textContent = 'Select a game to edit.'
        recordsList.className = 'records-list'
        recordsList.innerHTML = ''

        const { data, error } = await supabase
            .from('games')
            .select(`
                id,
                dynasty_id,
                season_id,
                home_team,
                away_team,
                home_score,
                away_score,
                week,
                is_rivalry,
                is_playoff,
                is_conference_championship,
                notes,
                seasons (
                    year
                )
            `)
            .eq('dynasty_id', dynastyId)
            .order('week', { ascending: true })

        if (error) {
            setStatus(error.message, 'error')
            recordsList.className = 'records-list empty-state'
            recordsList.textContent = 'Could not load games.'
            return
        }

        const games = (data ?? []) as GameRecord[]

        if (games.length === 0) {
            setStatus('No games found for this dynasty yet.', 'neutral')
            recordsList.className = 'records-list empty-state'
            recordsList.textContent = 'No games found. Add a game first, then come back here to edit it.'
            return
        }

        recordsList.innerHTML = games
            .map((game) => {
                const title = `${game.away_team} at ${game.home_team}`
                const score = formatScore(game)
                const seasonYear = game.seasons?.[0]?.year
                const year = seasonYear ? `${seasonYear} Season` : 'Unknown season'
                const week = formatGameWeek(game.week)

                return `
                    <button class="record-button" type="button" data-game-id="${game.id}">
                        <span class="record-title">${title}</span>
                        <span class="record-meta">${year} • ${week}${score}</span>
                    </button>
                `
            })
            .join('')

        recordsList.querySelectorAll<HTMLButtonElement>('.record-button').forEach((button) => {
            button.addEventListener('click', async () => {
                selectedGameId = button.dataset.gameId ?? ''

                recordsList.querySelectorAll<HTMLButtonElement>('.record-button').forEach((recordButton) => {
                    recordButton.classList.toggle('active', recordButton.dataset.gameId === selectedGameId)
                })

                await loadGameEditor(selectedGameId)
            })
        })

        setStatus('Games loaded. Select one to edit.', 'neutral')
    }

    async function loadGameEditor(gameId: string) {
        if (!gameId) {
            clearEditor()
            return
        }

        setStatus('Loading selected game...', 'neutral')

        const { data, error } = await supabase
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single()

        if (error) {
            setStatus(error.message, 'error')
            clearEditor()
            return
        }

        const game = data as GameRecord
        const seasonOptions = await getSeasonOptions(game.dynasty_id, game.season_id)
        const gameType = getGameType(game)

        editorArea.className = 'editor-area'
        editorArea.innerHTML = `
            <form id="edit-game-form" class="edit-game-form">
                <label>
                    Season
                    <select id="game-season-id" required>
                        ${seasonOptions}
                    </select>
                </label>

                <div class="form-grid">
                    <label>
                        Home Team
                        <input id="home-team" type="text" value="${escapeHtml(game.home_team)}" required />
                    </label>

                    <label>
                        Away Team
                        <input id="away-team" type="text" value="${escapeHtml(game.away_team)}" required />
                    </label>
                </div>

                <div class="form-grid">
                    <label>
                        Home Score
                        <input id="home-score" type="number" value="${game.home_score ?? ''}" />
                    </label>

                    <label>
                        Away Score
                        <input id="away-score" type="number" value="${game.away_score ?? ''}" />
                    </label>
                </div>

                <label>
                    Week
                    <select id="week">
                        ${buildWeekOptions(game.week)}
                    </select>
                </label>

                <label>
                    Game Type
                    <select id="game-type">
                        <option value="regular_season" ${gameType === 'regular_season' ? 'selected' : ''}>Regular Season</option>
                        <option value="rivalry" ${gameType === 'rivalry' ? 'selected' : ''}>Rivalry Game</option>
                        <option value="conference_championship" ${gameType === 'conference_championship' ? 'selected' : ''}>Conference Championship</option>
                        <option value="playoff" ${gameType === 'playoff' ? 'selected' : ''}>Playoff Game</option>
                    </select>
                </label>

                <label>
                    Notes
                    <textarea id="game-notes" rows="4" placeholder="Optional game notes...">${escapeHtml(game.notes ?? '')}</textarea>
                </label>

                <div class="form-actions">
                    <button class="submit-button" type="submit">Save Changes</button>
                    <button id="delete-game-button" class="danger-button" type="button">Delete Game</button>
                </div>
            </form>
        `

        document.querySelector<HTMLFormElement>('#edit-game-form')?.addEventListener('submit', async (event) => {
            event.preventDefault()
            await updateGame(game.id)
        })

        document.querySelector<HTMLButtonElement>('#delete-game-button')?.addEventListener('click', async () => {
            await deleteGame(game.id)
        })

        setStatus('Game loaded. Make your changes, then save.', 'neutral')
    }

    async function updateGame(gameId: string) {
        const dynastyId = dynastySelect.value
        const seasonId = getSelectValue('#game-season-id')
        const homeTeam = getInputValue('#home-team')
        const awayTeam = getInputValue('#away-team')
        const homeScore = getNumberValue('#home-score')
        const awayScore = getNumberValue('#away-score')
        const week = getWeekValue('#week')
        const gameType = getSelectValue('#game-type')
        const notes = getTextAreaValue('#game-notes')

        const isRivalry = gameType === 'rivalry'
        const isPlayoff = gameType === 'playoff'
        const isConferenceChampionship = gameType === 'conference_championship'

        if (!dynastyId || !seasonId || !homeTeam || !awayTeam) {
            setStatus('Please choose a season and enter both teams.', 'error')
            return
        }

        const { error } = await supabase
            .from('games')
            .update({
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
            .eq('id', gameId)
            .eq('dynasty_id', dynastyId)

        if (error) {
            setStatus(error.message, 'error')
            return
        }

        setStatus('Game updated.', 'success')
        await loadGames(dynastyId)
        clearEditor()
    }

    async function deleteGame(gameId: string) {
        const dynastyId = dynastySelect.value

        if (!dynastyId) {
            setStatus('Choose a dynasty before deleting a game.', 'error')
            return
        }

        const confirmed = window.confirm('Delete this game? This cannot be undone.')

        if (!confirmed) {
            return
        }

        const { error } = await supabase
            .from('games')
            .delete()
            .eq('id', gameId)
            .eq('dynasty_id', dynastyId)

        if (error) {
            setStatus(error.message, 'error')
            return
        }

        selectedGameId = ''
        setStatus('Game deleted.', 'success')
        await loadGames(dynastyId)
        clearEditor()
    }

    async function getSeasonOptions(dynastyId: string, selectedSeasonId = '') {
        const { data, error } = await supabase
            .from('seasons')
            .select('id, year')
            .eq('dynasty_id', dynastyId)
            .order('year', { ascending: false })

        if (error) {
            return `<option value="">${escapeHtml(error.message)}</option>`
        }

        if (!data || data.length === 0) {
            return '<option value="">No seasons yet</option>'
        }

        return data
            .map((season) => {
                const selected = season.id === selectedSeasonId ? 'selected' : ''
                return `<option value="${season.id}" ${selected}>${season.year} Season</option>`
            })
            .join('')
    }

    function clearEditor() {
        editorArea.className = 'editor-area empty-state'
        editorArea.textContent = 'Select a game to edit.'
    }

    function setStatus(message: string, type: 'success' | 'error' | 'neutral' = 'neutral') {
        statusMessage.textContent = message
        statusMessage.className = `status-message ${type}`
    }
}

function buildDynastyOptions(dynasties: Dynasty[]) {
    if (!dynasties.length) {
        return '<option value="">No dynasties found</option>'
    }

    return `
        <option value="">Choose a dynasty</option>
        ${dynasties
            .map((dynasty) => `<option value="${dynasty.id}">${escapeHtml(dynasty.name)}</option>`)
            .join('')}
    `
}

function buildWeekOptions(selectedWeek: number | null | undefined) {
    const weekOptions = Array.from({ length: 16 }, (_, index) => {
        const selected = selectedWeek === index ? 'selected' : ''

        return `<option value="${index}" ${selected}>Week ${index}</option>`
    }).join('')

    const postSeasonSelected = selectedWeek === null || selectedWeek === undefined ? 'selected' : ''

    return `
        ${weekOptions}
        <option value="" ${postSeasonSelected}>Post-Season</option>
    `
}

function formatScore(game: GameRecord) {
    if (game.home_score === null || game.away_score === null) {
        return ''
    }

    return ` • ${game.away_score}-${game.home_score}`
}

function formatGameWeek(week: number | null | undefined) {
    if (week === null || week === undefined) {
        return 'Post-Season'
    }

    return `Week ${week}`
}

function getGameType(game: GameRecord) {
    if (game.is_conference_championship) return 'conference_championship'
    if (game.is_playoff) return 'playoff'
    if (game.is_rivalry) return 'rivalry'

    return 'regular_season'
}

function getRequiredElement<T extends HTMLElement>(selector: string) {
    const element = document.querySelector<T>(selector)

    if (!element) {
        throw new Error(`Missing required element: ${selector}`)
    }

    return element
}

function getWeekValue(selector: string) {
    const value = document.querySelector<HTMLSelectElement>(selector)?.value

    if (value === undefined || value === '') {
        return null
    }

    return Number(value)
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

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}