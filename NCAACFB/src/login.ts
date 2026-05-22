import { signIn, signUp } from './auth'
import loginHtml from './login/login.html?raw'

export function setupLoginPage() {
  const app = document.querySelector<HTMLDivElement>('#app')

  if (!app) return

  app.innerHTML = loginHtml

  const emailInput = document.querySelector<HTMLInputElement>('#email')
  const passwordInput = document.querySelector<HTMLInputElement>('#password')
  const message = document.querySelector<HTMLParagraphElement>('#message')
  const loginBtn = document.querySelector<HTMLButtonElement>('#login-btn')
  const signupBtn = document.querySelector<HTMLButtonElement>('#signup-btn')

  if (!emailInput || !passwordInput || !message || !loginBtn || !signupBtn) return

  const getEmail = () => emailInput.value.trim()
  const getPassword = () => passwordInput.value

  loginBtn.addEventListener('click', async () => {
    message.textContent = 'Logging in...'

    const { error } = await signIn(getEmail(), getPassword())

    if (error) {
      message.textContent = error.message
      return
    }

    let secondsLeft = 3
    message.textContent = `Logged in! Redirecting in ${secondsLeft} seconds...`

    const countdown = setInterval(() => {
      secondsLeft--

      if (secondsLeft <= 0) {
        clearInterval(countdown)
        window.location.href = '/home'
        return
      }

      message.textContent = `Logged in! Redirecting in ${secondsLeft} seconds...`
    }, 1000)
  })

  signupBtn.addEventListener('click', async () => {
    message.textContent = 'Creating account...'

    const { error } = await signUp(getEmail(), getPassword())

    if (error) {
      message.textContent = error.message
      return
    }

    message.textContent = 'Account created! You can now log in.'
  })
}