import { signIn, signUp } from './auth'

export function setupLoginPage() {
  const app = document.querySelector<HTMLDivElement>('#app')!

  app.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #0a0a0a;
      color: white;
      font-family: system-ui;
    ">
      <h1 style="font-size: 48px; margin-bottom: 8px;">CFB Dynasty</h1>
      <p style="color: #888; margin-bottom: 40px;">League Hub</p>

      <div style="
        background: #1a1a1a;
        padding: 40px;
        border-radius: 12px;
        width: 100%;
        max-width: 400px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      ">
        <input id="email" type="email" placeholder="Email" style="
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #333;
          background: #111;
          color: white;
          font-size: 16px;
        "/>
        <input id="password" type="password" placeholder="Password" style="
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #333;
          background: #111;
          color: white;
          font-size: 16px;
        "/>
        <button id="login-btn" style="
          padding: 12px;
          border-radius: 8px;
          border: none;
          background: #D4A017;
          color: black;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        ">Log In</button>
        <button id="signup-btn" style="
          padding: 12px;
          border-radius: 8px;
          border: none;
          background: #222;
          color: white;
          font-size: 16px;
          cursor: pointer;
        ">Sign Up</button>
        <p id="message" style="color: #888; text-align: center; font-size: 14px;"></p>
      </div>
    </div>
  `

  const email = () => (document.querySelector<HTMLInputElement>('#email')!).value
  const password = () => (document.querySelector<HTMLInputElement>('#password')!).value
  const message = document.querySelector<HTMLParagraphElement>('#message')!

  document.querySelector('#login-btn')!.addEventListener('click', async () => {
    message.textContent = 'Logging in...'
    let secondsLeft = 3

    const { error } = await signIn(email(), password())

    if (error) {
      message.textContent = error.message
    } else {
      message.textContent = 'Logged in! Redirecting in ${secondsLeft} seconds...'
      const countdown =- setInterval(() => {
        secondsLeft--
        message.textContent = 'Logged in! Redirecting in ${secondsLeft} seconds...'
        if (secondsLeft <= 0) {
          clearInterval(countdown)
          window.location.href = '/home/'
        }
      }, 1000)
    }
  })

  document.querySelector('#signup-btn')!.addEventListener('click', async () => {
    const { error } = await signUp(email(), password())
    if (error) {
      message.textContent = error.message
    } else {
      message.textContent = 'Account created! You can now log in.'
    }
  })
}
