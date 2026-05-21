import './style.css'
import { getUser } from './auth'
import { setupLoginPage } from './login'

async function init() {
  const user = await getUser()

  if (!user) {
    setupLoginPage()
  } else {
    document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
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
        <h1>Welcome to CFB Dynasty</h1>
        <p style="color: #888;">Logged in as: ${user.email}</p>
        <button id="logout-btn" style="
          margin-top: 24px;
          padding: 12px 24px;
          border-radius: 8px;
          border: none;
          background: #D4A017;
          color: black;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        ">Log Out</button>
      </div>
    `

    const { signOut } = await import('./auth')
    document.querySelector('#logout-btn')!.addEventListener('click', async () => {
      await signOut()
      window.location.reload()
    })
  }
}

init()
