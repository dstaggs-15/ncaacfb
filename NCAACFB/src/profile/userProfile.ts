import { supabase } from '../supabase'
import userProfileHtml from './userProfile.html?raw'
import './userProfile.css'

export async function setupUserProfilePage() {
  const app = document.querySelector<HTMLDivElement>('#app')

  if (!app) {
    throw new Error('App root element not found')
  }

  app.innerHTML = userProfileHtml

  const form = document.querySelector<HTMLFormElement>('#user-profile-form')
  const displayNameInput = document.querySelector<HTMLInputElement>('#display-name')
  const message = document.querySelector<HTMLParagraphElement>('#profile-message')

  if (!form || !displayNameInput || !message) {
    throw new Error('User profile page elements not found')
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session) {
    window.location.href = '/'
    return
  }

  const userId = session.user.id

  await loadProfile(userId, displayNameInput, message)

  form.addEventListener('submit', async event => {
    event.preventDefault()

    const displayName = displayNameInput.value.trim()

    if (!displayName) {
      setMessage(message, 'Display name is required.', 'error')
      return
    }

    if (displayName.length > 40) {
      setMessage(message, 'Display name must be 40 characters or fewer.', 'error')
      return
    }

    await saveDisplayName(userId, displayName, message)
  })
}

async function loadProfile(
  userId: string,
  displayNameInput: HTMLInputElement,
  message: HTMLParagraphElement
) {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    setMessage(message, 'Could not load profile.', 'error')
    return
  }

  if (data?.display_name) {
    displayNameInput.value = data.display_name
  }
}

async function saveDisplayName(
  userId: string,
  displayName: string,
  message: HTMLParagraphElement
) {
  setMessage(message, 'Saving display name...', '')

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    setMessage(message, 'Could not save display name.', 'error')
    return
  }

  setMessage(message, 'Display name saved.', 'success')
}

function setMessage(
  element: HTMLParagraphElement,
  text: string,
  status: 'success' | 'error' | ''
) {
  element.textContent = text
  element.className = status ? `profile-message ${status}` : 'profile-message'
}