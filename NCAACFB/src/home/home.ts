export function setupHomePage() {
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
      padding: 20px;
    ">
      <h1 style="font-size: clamp(32px, 8vw, 64px); margin-bottom: 8px; text-align: center;">CFB Dynasty</h1>
      <p style="color: #888; margin-bottom: 40px; text-align: center;">League Hub</p>
      <div style="
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        justify-content: center;
        max-width: 500px;
        width: 100%;
      ">
        <button id="dynasty-btn" style="
          flex: 1;
          min-width: 140px;
          padding: 14px 24px;
          background: #D4A017;
          color: black;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        ">Dynasty Tracker</button>
        <button id="blogger-btn" style="
          flex: 1;
          min-width: 140px;
          padding: 14px 24px;
          background: #222;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
        ">Blog Generator</button>
        <button id="add-btn" style="
          flex: 1;
          min-width: 140px;
          padding: 14px 24px;
          background: #1a472a;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
        ">+ Add Stats</button>
        <button id="logout-btn" style="
          flex: 1;
          min-width: 140px;
          padding: 14px 24px;
          background: #333;
          color: #888;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
        ">Log Out</button>
      </div>
    </div>
  `

  document.querySelector('#dynasty-btn')?.addEventListener('click', () => {
    window.location.href = '/dynasty/'
  })

  document.querySelector('#blogger-btn')?.addEventListener('click', () => {
    window.location.href = '/blogger/'
  })

  document.querySelector('#add-btn')?.addEventListener('click', () => {
    window.location.href = '/dynasty/add/'
  })

  document.querySelector('#logout-btn')?.addEventListener('click', async () => {
    const { signOut } = await import('../auth')
    await signOut()
    window.location.href = '/'
  })
}
