import homeHtml from './home.html?raw'

export function setupHomePage() {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = homeHtml

  document.querySelector<HTMLButtonElement>('#dynasty-btn')?.addEventListener('click', () => {
    window.location.href = '/dynasty/'
  })

  document.querySelector<HTMLButtonElement>('#blogger-btn')?.addEventListener('click', () => {
    window.location.href = '/blogger/'
  })

  document.querySelector<HTMLButtonElement>('#add-btn')?.addEventListener('click', () => {
    window.location.href = '/dynasty/add/'
  })

  document.querySelector<HTMLButtonElement>('#logout-btn')?.addEventListener('click', async () => {
    const { signOut } = await import('../auth')
    await signOut()
    window.location.href = '/'
  })
}