import { supabase } from '../supabase'

export async function getActiveDynasty() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  // First get dynasty IDs this user is a member of
  const { data: memberships } = await supabase
    .from('dynasty_members')
    .select('dynasty_id')
    .eq('profile_id', session.user.id)

  if (!memberships || memberships.length === 0) return null

  const dynastyId = memberships[0].dynasty_id

  // Then fetch that dynasty
  const { data, error } = await supabase
    .from('dynasties')
    .select('*')
    .eq('id', dynastyId)
    .single()

  if (error) return null
  return data
}

export async function getAllDynasties() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data: memberships } = await supabase
    .from('dynasty_members')
    .select('dynasty_id')
    .eq('profile_id', session.user.id)

  if (!memberships || memberships.length === 0) return []

  const ids = memberships.map((m: any) => m.dynasty_id)

  const { data, error } = await supabase
    .from('dynasties')
    .select('*')
    .in('id', ids)

  if (error) return []
  return data ?? []
}

export async function getCurrentSeason(dynastyId: string) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('dynasty_id', dynastyId)
    .eq('is_current', true)
    .single()

  if (error) return null
  return data
}
