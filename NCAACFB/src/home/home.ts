import '../style.css'

const dynastyBtn = document.querySelector<HTMLButtonElement>('#dynasty-btn')
const bloggerBtn = document.querySelector<HTMLButtonElement>('#blogger-btn')

dynastyBtn?.addEventListener('click', () => {
  window.location.href = '/dynasty/'
})

bloggerBtn?.addEventListener('click', () => {
  window.location.href = '/blogger/'
})