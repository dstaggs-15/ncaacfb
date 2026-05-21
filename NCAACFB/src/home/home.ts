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
    ">
      <h1 style="font-size: 48px; margin-bottom: 8px;">CFB Dynasty</h1>
      <p style="color: #888; margin-bottom: 40px;">League Hub</p>
      <div style="display: flex; gap: 16px;">
        <button id="dynasty-btn" style="
          padding: 12px 24px;
          background: #D4A017;
          color: black;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        ">Dynasty Tracker</button>
        <button id="blogger-btn" style="
          padding: 12px 24px;
          background: #222;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
        ">Blog Generator</button>
      </div>
    </div>
  `

  document.querySelector<HTMLButtonElement>('#dynasty-btn')?.addEventListener('click', () => {
    window.location.href = '/dynasty/'
  })

  document.querySelector<HTMLButtonElement>('#blogger-btn')?.addEventListener('click', () => {
    window.location.href = '/blogger/'
  })
}
