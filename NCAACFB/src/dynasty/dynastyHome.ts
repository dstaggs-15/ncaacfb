import "../style.css";
import "./dynastyHome.css";
import dynastyHomeHtml from "./dynastyHome.html?raw";

import { supabase } from "../supabase";

function getStoredDynastyId(userId: string) {
    return localStorage.getItem(`activeDynastyId:${userId}`);
}

function setStoredDynastyId(userId: string, dynastyId: string) {
    localStorage.setItem(`activeDynastyId:${userId}`, dynastyId);
}

function showElement(element: HTMLElement) {
    element.classList.remove("hidden");
}

function hideElement(element: HTMLElement) {
    element.classList.add("hidden");
}

function setText(selector: string, value: string) {
    const element = document.querySelector<HTMLElement>(selector);

    if (element) {
        element.textContent = value;
    }
}

function setHref(selector: string, href: string) {
    const element = document.querySelector<HTMLAnchorElement>(selector);

    if (element) {
        element.href = href;
    }
}

function getDynastyUrl(path: string, dynastyId?: string) {
    if (!dynastyId) {
        return path;
    }

    return `${path}?dynastyId=${dynastyId}`;
}

async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
}

async function createDynasty(name: string, userId: string) {
    const { data: newDynasty, error } = await supabase
        .from("dynasties")
        .insert({
            name,
            is_active: true
        })
        .select()
        .single();

    if (error) {
        return {
            newDynasty: null,
            error
        };
    }

    const { error: memberError } = await supabase
        .from("dynasty_members")
        .insert({
            dynasty_id: newDynasty.id,
            profile_id: userId,
            role: "owner"
        });

    if (memberError) {
        return {
            newDynasty: null,
            error: memberError
        };
    }

    setStoredDynastyId(userId, newDynasty.id);

    return {
        newDynasty,
        error: null
    };
}

async function showLogin() {
    const loginView = document.querySelector<HTMLElement>("#dynasty-login-view")!;
    const emptyView = document.querySelector<HTMLElement>("#dynasty-empty-view")!;
    const dashboardView = document.querySelector<HTMLElement>("#dynasty-dashboard-view")!;

    showElement(loginView);
    hideElement(emptyView);
    hideElement(dashboardView);

    document.querySelector("#login-btn")?.addEventListener("click", async () => {
        const email = document.querySelector<HTMLInputElement>("#email")!.value;
        const password = document.querySelector<HTMLInputElement>("#password")!.value;
        const msg = document.querySelector<HTMLElement>("#login-msg")!;

        msg.textContent = "Signing in...";

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            msg.textContent = error.message;
            return;
        }

        await showDynasty();
    });
}

async function showEmptyDynastyView(userId: string) {
    const loginView = document.querySelector<HTMLElement>("#dynasty-login-view")!;
    const emptyView = document.querySelector<HTMLElement>("#dynasty-empty-view")!;
    const dashboardView = document.querySelector<HTMLElement>("#dynasty-dashboard-view")!;

    hideElement(loginView);
    showElement(emptyView);
    hideElement(dashboardView);

    document.querySelector("#empty-logout-btn")?.addEventListener("click", async (event) => {
        event.preventDefault();
        await signOut();
    });

    document.querySelector("#empty-create-btn")?.addEventListener("click", () => {
        const form = document.querySelector<HTMLElement>("#empty-create-form")!;
        form.classList.toggle("hidden");
    });

    document.querySelector("#empty-submit-dynasty")?.addEventListener("click", async () => {
        const nameInput = document.querySelector<HTMLInputElement>("#empty-dynasty-name")!;
        const msg = document.querySelector<HTMLElement>("#empty-create-msg")!;
        const name = nameInput.value.trim();

        if (!name) {
            msg.textContent = "Please enter a name.";
            return;
        }

        msg.textContent = "Creating dynasty...";

        const { newDynasty, error } = await createDynasty(name, userId);

        if (error || !newDynasty) {
            msg.textContent = error?.message ?? "Could not create dynasty.";
            return;
        }

        msg.textContent = "Dynasty created.";

        await showDynasty(newDynasty.id);
    });
}

async function showDynasty(selectedDynastyId?: string) {
    const {
        data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
        return false;
    }

    const { data: memberships } = await supabase
        .from("dynasty_members")
        .select("dynasty_id")
        .eq("profile_id", session.user.id);

    if (!memberships || memberships.length === 0) {
        await showEmptyDynastyView(session.user.id);
        return true;
    }

    const dynastyIds = memberships.map((membership: any) => membership.dynasty_id);

    const { data: allDynasties } = await supabase
        .from("dynasties")
        .select("*")
        .in("id", dynastyIds);

    const storedDynastyId = getStoredDynastyId(session.user.id);

    const activeDynastyId =
        selectedDynastyId ??
        storedDynastyId ??
        dynastyIds[0];

    const dynasty =
        allDynasties?.find((item: any) => item.id === activeDynastyId) ??
        allDynasties?.[0];

    if (dynasty?.id) {
        setStoredDynastyId(session.user.id, dynasty.id);
    }

    const dynastyName = dynasty?.name ?? "No Active Dynasty";
    const dynastyStatus = dynasty?.is_active ? "Active" : "Inactive";
    const dynastyId = dynasty?.id;

    const loginView = document.querySelector<HTMLElement>("#dynasty-login-view")!;
    const emptyView = document.querySelector<HTMLElement>("#dynasty-empty-view")!;
    const dashboardView = document.querySelector<HTMLElement>("#dynasty-dashboard-view")!;

    hideElement(loginView);
    hideElement(emptyView);
    showElement(dashboardView);

    const dynastySelector = document.querySelector<HTMLSelectElement>("#dynasty-selector")!;

    dynastySelector.innerHTML =
        allDynasties
            ?.map((item: any) => {
                const selected = item.id === dynasty?.id ? "selected" : "";

                return `
                    <option value="${item.id}" ${selected}>
                        ${item.name}
                    </option>
                `;
            })
            .join("") ?? "";

    setText("#dynasty-status", dynastyStatus);
    setText("#active-dynasty-name", dynastyName);
    setText("#active-dynasty-status", dynastyStatus);
    setText("#dynasty-count", String(allDynasties?.length ?? 0));

    setHref("#view-seasons-link", getDynastyUrl("/dynasty/seasons/", dynastyId));
    setHref("#seasons-link", getDynastyUrl("/dynasty/seasons/", dynastyId));
    setHref("#teams-link", getDynastyUrl("/dynasty/teams/", dynastyId));
    setHref("#coaches-link", getDynastyUrl("/dynasty/coaches/coaches/", dynastyId));
    setHref("#standings-link", getDynastyUrl("/dynasty/standings/", dynastyId));
    setHref("#add-stats-link", getDynastyUrl("/dynasty/addStats/addStats/", dynastyId));
    setHref("#recruitment-link", getDynastyUrl("/dynasty/recruitment/recruitment/", dynastyId));

    dynastySelector.addEventListener("change", async (event) => {
        const selected = (event.target as HTMLSelectElement).value;

        setStoredDynastyId(session.user.id, selected);

        await showDynasty(selected);
    });

    document.querySelector("#logout-btn")?.addEventListener("click", async (event) => {
        event.preventDefault();
        await signOut();
    });

    document.querySelector("#show-create")?.addEventListener("click", () => {
        const createForm = document.querySelector<HTMLElement>("#create-form")!;
        const inviteForm = document.querySelector<HTMLElement>("#invite-form")!;

        createForm.classList.toggle("hidden");
        inviteForm.classList.add("hidden");
    });

    document.querySelector("#show-invite")?.addEventListener("click", () => {
        const createForm = document.querySelector<HTMLElement>("#create-form")!;
        const inviteForm = document.querySelector<HTMLElement>("#invite-form")!;

        inviteForm.classList.toggle("hidden");
        createForm.classList.add("hidden");
    });

    document.querySelector("#submit-create")?.addEventListener("click", async () => {
        const nameInput = document.querySelector<HTMLInputElement>("#new-dynasty-name")!;
        const msg = document.querySelector<HTMLElement>("#create-msg")!;
        const name = nameInput.value.trim();

        if (!name) {
            msg.textContent = "Enter a name.";
            return;
        }

        msg.textContent = "Creating dynasty...";

        const { newDynasty, error } = await createDynasty(name, session.user.id);

        if (error || !newDynasty) {
            msg.textContent = error?.message ?? "Could not create dynasty.";
            return;
        }

        msg.textContent = "Dynasty created.";

        await showDynasty(newDynasty.id);
    });

    document.querySelector("#submit-invite")?.addEventListener("click", async () => {
        const emailInput = document.querySelector<HTMLInputElement>("#invite-email")!;
        const msg = document.querySelector<HTMLElement>("#invite-msg")!;
        const email = emailInput.value.trim();

        if (!email) {
            msg.textContent = "Enter an email.";
            return;
        }

        if (!dynasty?.id) {
            msg.textContent = "No active dynasty selected.";
            return;
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", email)
            .single();

        if (!profile) {
            msg.textContent = "User not found. They need to sign up first.";
            return;
        }

        const { error } = await supabase
            .from("dynasty_members")
            .insert({
                dynasty_id: dynasty.id,
                profile_id: profile.id,
                role: "member"
            });

        msg.textContent = error ? error.message : "Member invited.";
    });

    return true;
}

export default async function init() {
    const app = document.querySelector<HTMLDivElement>("#app")!;

    app.innerHTML = dynastyHomeHtml;

    const loaded = await showDynasty();

    if (!loaded) {
        await showLogin();
    }
}