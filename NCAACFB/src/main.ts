import './style.css'
import { getUser } from './auth'
import { setupLoginPage } from './login'

async function init() {
  const path = window.location.pathname
  const user = await getUser()

  if (!user) {
    setupLoginPage()
    return
  }

  if (path === '/' || path === '') {
    window.location.href = '/home/'
    return
  }

  if (path.startsWith('/home')) {
    const { setupHomePage } = await import('./home/home')
    setupHomePage()
    return
  }

  if (path.startsWith('/dynasty/add')) {
    const { default: initAddStats } = await import('./dynasty/addStats')
    return
  }

  if (path.startsWith('/dynasty/seasons')) {
    const { default: initSeasons } = await import('./dynasty/seasons')
    return
  }

  if (path.startsWith('/dynasty/coaches')) {
    const { default: initCoaches } = await import('./dynasty/coaches')
    return
  }

  if (path.startsWith('/dynasty/standings')) {
    const { default: initStandings } = await import('./dynasty/standings')
    return
  }

  if (path.startsWith('/dynasty')) {
    const { default: initDynasty } = await import('./dynasty/dynastyHome')
    return
  }
}

init()
