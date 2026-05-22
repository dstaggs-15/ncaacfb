import { supabase } from '../supabase'

export async function getActiveDynasty() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data, error } = await supabase
    .from('dynasty_members')
    .select('dynasty_id, dynasties(*)')
    .eq('profile_id', session.user.id)
    .limit(1)
    .single()

  if (error) return null
  return (data as any)?.dynasties ?? null
}

export async function getAllDynasties() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data, error } = await supabase
    .from('dynasty_members')
    .select('dynasty_id, dynasties(*)')
    .eq('profile_id', session.user.id)
    .order('joined_at', { ascending: false })

  if (error) return []
  return data?.map((d: any) => d.dynasties) ?? []
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
