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
}

init()
