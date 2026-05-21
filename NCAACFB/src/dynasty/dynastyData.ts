import { supabase } from '../supabase'

export async function getActiveDynasty() {
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
  const { data, error } = await supabase
    .from('dynasties')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}

export async function getCurrentSeason(dynastyId: string) {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('dynasty_id', dynastyId)
    .eq('is_current', true)
    .single()

  if (error) return null
  return data
}
