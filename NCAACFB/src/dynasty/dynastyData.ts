import { supabase } from '../supabase'

export async function getActiveDynasty() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data, error } = await supabase
    .from('dynasties')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (error) return null
  return data
}

export async function getAllDynasties() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data, error } = await supabase
    .from('dynasties')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return []
  return data
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
