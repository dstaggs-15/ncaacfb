import recruitmentHtml from './recruitment.html?raw'
import './recruitment.css'

type PitchValue = 'yes' | 'no'

type PitchInput = {
  id: string
  label: string
}

type Motivation = {
  id: string
  label: string
  icon: string
  conditions: Partial<Record<string, PitchValue>>
}

const pitchInputs: PitchInput[] = [
  { id: 'academic_prestige', label: 'Academic Prestige' },
  { id: 'athletic_facilities', label: 'Athletic Facilities' },
  { id: 'brand_exposure', label: 'Brand Exposure' },
  { id: 'campus_lifestyle', label: 'Campus Lifestyle' },
  { id: 'championship_contender', label: 'Championship Contender' },
  { id: 'coach_prestige', label: 'Coach Prestige' },
  { id: 'coach_stability', label: 'Coach Stability' },
  { id: 'conference_prestige', label: 'Conference Prestige' },
  { id: 'playing_style', label: 'Playing Style' },
  { id: 'playing_time', label: 'Playing Time' },
  { id: 'pro_potential', label: 'Pro Potential' },
  { id: 'program_tradition', label: 'Program Tradition' },
  { id: 'proximity_to_home', label: 'Proximity To Home' },
  { id: 'stadium_atmosphere', label: 'Stadium Atmosphere' },
]

const motivations: Motivation[] = [
  {
    id: 'college_experience',
    label: 'College Experience',
    icon: '🎒',
    conditions: {
      academic_prestige: 'yes',
      campus_lifestyle: 'yes',
      stadium_atmosphere: 'yes',
    },
  },
  {
    id: 'team_player',
    label: 'Team Player',
    icon: '🤝',
    conditions: {
      coach_stability: 'yes',
      playing_style: 'yes',
      proximity_to_home: 'yes',
    },
  },
  {
    id: 'campus_personality',
    label: 'Campus Personality',
    icon: '🏛️',
    conditions: {
      campus_lifestyle: 'yes',
      playing_style: 'yes',
      playing_time: 'yes',
    },
  },
  {
    id: 'gamer',
    label: 'Gamer',
    icon: '🎮',
    conditions: {
      conference_prestige: 'yes',
      playing_style: 'yes',
      pro_potential: 'yes',
    },
  },
  {
    id: 'standard_bearer',
    label: 'Standard Bearer',
    icon: '👑',
    conditions: {
      coach_prestige: 'yes',
      conference_prestige: 'yes',
      playing_style: 'yes',
    },
  },
  {
    id: 'student_of_the_game',
    label: 'Student Of The Game',
    icon: '📖',
    conditions: {
      academic_prestige: 'yes',
      coach_prestige: 'yes',
      proximity_to_home: 'yes',
    },
  },
  {
    id: 'hometown_hero',
    label: 'Hometown Hero',
    icon: '🏠',
    conditions: {
      championship_contender: 'yes',
      program_tradition: 'yes',
      proximity_to_home: 'yes',
    },
  },
  {
    id: 'status_seeker',
    label: 'Status Seeker',
    icon: '🔎',
    conditions: {
      brand_exposure: 'yes',
      coach_prestige: 'yes',
      conference_prestige: 'yes',
    },
  },
  {
    id: 'the_clutch',
    label: 'The Clutch',
    icon: '👟',
    conditions: {
      coach_stability: 'yes',
      playing_style: 'yes',
      playing_time: 'yes',
    },
  },
  {
    id: 'primetime_player',
    label: 'Primetime Player',
    icon: '▶️',
    conditions: {
      brand_exposure: 'yes',
      championship_contender: 'yes',
      playing_time: 'yes',
    },
  },
  {
    id: 'coach_connection',
    label: 'Coach Connection',
    icon: '🪖',
    conditions: {
      athletic_facilities: 'yes',
      coach_prestige: 'yes',
      proximity_to_home: 'yes',
    },
  },
  {
    id: 'aspirational_goals',
    label: 'Aspirational Goals',
    icon: '💎',
    conditions: {
      championship_contender: 'yes',
      coach_prestige: 'yes',
      conference_prestige: 'yes',
    },
  },
  {
    id: 'to_the_house',
    label: 'To The House',
    icon: '🙌',
    conditions: {
      brand_exposure: 'yes',
      championship_contender: 'yes',
      coach_prestige: 'yes',
    },
  },
  {
    id: 'football_influencer',
    label: 'Football Influencer',
    icon: '📱',
    conditions: {
      brand_exposure: 'yes',
      playing_time: 'yes',
      pro_potential: 'yes',
    },
  },
  {
    id: 'clocked_in',
    label: 'Clocked In',
    icon: '⏱️',
    conditions: {
      playing_style: 'yes',
      playing_time: 'yes',
      pro_potential: 'yes',
    },
  },
  {
    id: 'star_search',
    label: 'Star Search',
    icon: '⭐',
    conditions: {
      brand_exposure: 'yes',
      playing_time: 'yes',
      proximity_to_home: 'yes',
    },
  },
  {
    id: 'grassroots',
    label: 'Grassroots',
    icon: '🌱',
    conditions: {
      program_tradition: 'yes',
      proximity_to_home: 'yes',
      stadium_atmosphere: 'yes',
    },
  },
  {
    id: 'conference_legend',
    label: 'Conference Legend',
    icon: '🏆',
    conditions: {
      championship_contender: 'yes',
      conference_prestige: 'yes',
      proximity_to_home: 'yes',
    },
  },
  {
    id: 'sunday_player',
    label: 'Sunday Player',
    icon: '🛡️',
    conditions: {
      championship_contender: 'yes',
      conference_prestige: 'yes',
      pro_potential: 'yes',
    },
  },
  {
    id: 'gym_rat',
    label: 'Gym Rat',
    icon: '💪',
    conditions: {
      athletic_facilities: 'yes',
      brand_exposure: 'yes',
      pro_potential: 'yes',
    },
  },
]

const selectedPitches: Partial<Record<string, PitchValue>> = {}

export function setupRecruitmentPage() {
  const app = document.querySelector<HTMLDivElement>('#app')

  if (!app) {
    return
  }

  app.innerHTML = recruitmentHtml

  renderMotivations()
  renderPitchInputs()
  renderYesCounter()
}

function renderMotivations() {
  const grid = document.querySelector<HTMLDivElement>('#motivation-grid')

  if (!grid) {
    return
  }

  grid.innerHTML = motivations
    .map((motivation) => {
      const possible = motivationIsPossible(motivation)

      return `
        <article class="motivation-card ${possible ? 'possible' : 'impossible'}">
          <div class="motivation-icon">
            ${motivation.icon}
          </div>
          <div class="motivation-label">
            ${motivation.label}
          </div>
        </article>
      `
    })
    .join('')
}

function renderYesCounter() {
  const counter = document.querySelector<HTMLParagraphElement>('#yes-counter')

  if (!counter) {
    return
  }

  counter.textContent = `YES selected: ${getYesCount()} / 3`
}

function renderPitchInputs() {
  const container = document.querySelector<HTMLDivElement>('#pitch-inputs')

  if (!container) {
    return
  }

  container.innerHTML = pitchInputs
    .map((input) => {
      const selected = selectedPitches[input.id]

      return `
        <div class="pitch-row">
          <div class="pitch-buttons">
            <button
              type="button"
              class="pitch-btn yes ${selected === 'yes' ? 'active' : ''}"
              data-input-id="${input.id}"
              data-value="yes"
            >
              Yes
            </button>

            <button
              type="button"
              class="pitch-btn no ${selected === 'no' ? 'active' : ''}"
              data-input-id="${input.id}"
              data-value="no"
            >
              No
            </button>
          </div>

          <span class="pitch-label">${input.label}</span>
        </div>
      `
    })
    .join('')

  container.querySelectorAll<HTMLButtonElement>('.pitch-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const inputId = button.dataset.inputId
      const value = button.dataset.value as PitchValue | undefined

      if (!inputId || !value) {
        return
      }

      updatePitchSelection(inputId, value)
    })
  })
}

function updatePitchSelection(inputId: string, value: PitchValue) {
  const currentValue = selectedPitches[inputId]

  if (currentValue === value) {
    delete selectedPitches[inputId]
  } else {
    if (value === 'yes' && getYesCount() >= 3) {
      return
    }

    selectedPitches[inputId] = value
  }

  renderPitchInputs()
  renderMotivations()
  renderYesCounter()
}

function getYesCount() {
  return Object.values(selectedPitches).filter((value) => value === 'yes').length
}

function motivationIsPossible(motivation: Motivation) {
  for (const [inputId, selectedValue] of Object.entries(selectedPitches)) {
    const requiredValue = motivation.conditions[inputId]

    if (requiredValue && requiredValue !== selectedValue) {
      return false
    }
  }

  return true
}