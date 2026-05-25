import { supabase } from "../supabase";

export function getStoredDynastyId(userId: string) {
    return localStorage.getItem(`activeDynastyId:${userId}`);
}

export function setStoredDynastyId(userId: string, dynastyId: string) {
    localStorage.setItem(`activeDynastyId:${userId}`, dynastyId);
}

export async function getAllDynasties() {
    const {
        data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
        return [];
    }

    const { data: memberships } = await supabase
        .from("dynasty_members")
        .select("dynasty_id")
        .eq("profile_id", session.user.id);

    if (!memberships || memberships.length === 0) {
        return [];
    }

    const ids = memberships.map((membership: any) => membership.dynasty_id);

    const { data, error } = await supabase
        .from("dynasties")
        .select("*")
        .in("id", ids);

    if (error) {
        return [];
    }

    return data ?? [];
}

export async function getActiveDynasty() {
    const {
        data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
        return null;
    }

    const dynasties = await getAllDynasties();

    if (dynasties.length === 0) {
        return null;
    }

    const storedDynastyId = getStoredDynastyId(session.user.id);

    const activeDynasty =
        dynasties.find((dynasty: any) => dynasty.id === storedDynastyId) ??
        dynasties[0];

    if (activeDynasty?.id) {
        setStoredDynastyId(session.user.id, activeDynasty.id);
    }

    return activeDynasty;
}

export async function getCurrentSeason(dynastyId: string) {
    const {
        data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
        return null;
    }

    const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .eq("dynasty_id", dynastyId)
        .eq("is_current", true)
        .single();

    if (error) {
        return null;
    }

    return data;
}