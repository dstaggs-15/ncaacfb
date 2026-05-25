import "../../style.css";
import "./coaches.css";
import coachesHtml from "./coaches.html?raw";

import { supabase } from "../../supabase";
import { getAllDynasties } from "../dynastyData";

type Dynasty = {
  id: string;
  name: string;
};

type CoachRecord = {
  id: string;
  dynasty_id: string;
  profile_id: string | null;
  team: string;
  wins: number;
  losses: number;
  conference_wins: number;
  conference_losses: number;
  profiles?: {
    username: string | null;
  } | null;
};

let currentCoaches: CoachRecord[] = [];
let selectedCoachIds = new Set<string>();

async function init() {
  const app = document.querySelector<HTMLDivElement>("#app")!;
  app.innerHTML = coachesHtml;

  const dynastySelect =
    document.querySelector<HTMLSelectElement>("#dynasty-select");

  const coachListBody =
    document.querySelector<HTMLTableSectionElement>("#coach-list-body");

  const recordsTableBody =
    document.querySelector<HTMLTableSectionElement>("#coaches-table-body");

  const selectedCoachSummary =
    document.querySelector<HTMLParagraphElement>("#selected-coach-summary");

  if (
    !dynastySelect ||
    !coachListBody ||
    !recordsTableBody ||
    !selectedCoachSummary
  ) {
    console.error("Coaches page elements were not found.");
    return;
  }

  const dynasties = (await getAllDynasties()) as Dynasty[];

  renderDynastyOptions(dynastySelect, dynasties);

    dynastySelect.addEventListener("change", async () => {
    const dynastyId = dynastySelect.value;

    selectedCoachIds.clear();
    currentCoaches = [];

    renderNoSelectedCoaches(recordsTableBody, selectedCoachSummary);

    if (!dynastyId) {
        renderCoachIdle(coachListBody);
        return;
    }

    await loadCoachesForDynasty(dynastyId, coachListBody);
    });

    coachListBody.addEventListener("click", (event) => {
    const row = (event.target as HTMLElement).closest<HTMLTableRowElement>(
        "[data-coach-id]"
    );

    if (!row) return;

    const coachId = row.dataset.coachId;

    if (!coachId) return;

    if (selectedCoachIds.has(coachId)) {
        selectedCoachIds.delete(coachId);
    } else {
        selectedCoachIds.add(coachId);
    }

    renderCoachList(coachListBody, currentCoaches, selectedCoachIds);
    renderSelectedCoaches(recordsTableBody, selectedCoachSummary);
    });
}

function renderDynastyOptions(
  dynastySelect: HTMLSelectElement,
  dynasties: Dynasty[]
) {
  const optionsHtml = dynasties
    .map((dynasty) => {
      return `<option value="${dynasty.id}">${dynasty.name}</option>`;
    })
    .join("");

  dynastySelect.innerHTML = `
    <option value="">Choose a dynasty</option>
    ${optionsHtml}
  `;
}

async function loadCoachesForDynasty(
  dynastyId: string,
  coachListBody: HTMLTableSectionElement
) {
  coachListBody.innerHTML = `
    <tr>
      <td colspan="2" class="coaches-empty-row">
        Loading coaches...
      </td>
    </tr>
  `;

  const { data, error } = await supabase
    .from("coaches")
    .select(`
      *,
      profiles:profile_id (
        username
      )
    `)
    .eq("dynasty_id", dynastyId)
    .order("wins", { ascending: false });

  if (error) {
    console.error("Error loading coaches:", error);

    coachListBody.innerHTML = `
      <tr>
        <td colspan="2" class="coaches-empty-row coaches-error">
          Could not load coaches.
        </td>
      </tr>
    `;
    return;
  }

  currentCoaches = (data ?? []) as CoachRecord[];

  renderCoachList(coachListBody, currentCoaches, selectedCoachIds);
}

function renderCoachIdle(coachListBody: HTMLTableSectionElement) {
  coachListBody.innerHTML = `
    <tr>
      <td colspan="2" class="coaches-empty-row">
        Choose a dynasty to see the coaches.
      </td>
    </tr>
  `;
}

function renderCoachList(
  coachListBody: HTMLTableSectionElement,
  coaches: CoachRecord[],
  activeCoachIds: Set<string>
) {
  if (coaches.length === 0) {
    coachListBody.innerHTML = `
      <tr>
        <td colspan="2" class="coaches-empty-row">
          No coaches added to this dynasty yet.
        </td>
      </tr>
    `;
    return;
  }

  coachListBody.innerHTML = coaches
    .map((coach) => {
      const coachName = coach.profiles?.username ?? "Unknown";
      const isActive = activeCoachIds.has(coach.id);

      return `
        <tr 
          class="coaches-selectable-row ${isActive ? "is-selected" : ""}"
          data-coach-id="${coach.id}"
        >
          <td class="coaches-name">${coachName}</td>
          <td class="coaches-team">${coach.team}</td>
        </tr>
      `;
    })
    .join("");
}

function renderNoSelectedCoaches(
  recordsTableBody: HTMLTableSectionElement,
  selectedCoachSummary: HTMLParagraphElement
) {
  selectedCoachSummary.textContent = "Choose one or more coaches to view their records.";

  recordsTableBody.innerHTML = `
    <tr>
      <td colspan="4" class="coaches-empty-row">
        No coaches selected.
      </td>
    </tr>
  `;
}

function renderSelectedCoaches(
  recordsTableBody: HTMLTableSectionElement,
  selectedCoachSummary: HTMLParagraphElement
) {
  const selectedCoaches = currentCoaches.filter((coach) =>
    selectedCoachIds.has(coach.id)
  );

  if (selectedCoaches.length === 0) {
    renderNoSelectedCoaches(recordsTableBody, selectedCoachSummary);
    return;
  }

  selectedCoachSummary.textContent =
    selectedCoaches.length === 1
      ? "1 coach selected."
      : `${selectedCoaches.length} coaches selected.`;

  recordsTableBody.innerHTML = selectedCoaches
    .map((coach) => {
      const coachName = coach.profiles?.username ?? "Unknown";

      return `
        <tr>
          <td class="coaches-name">${coachName}</td>
          <td class="coaches-team">${coach.team}</td>
          <td class="coaches-record">${coach.wins}-${coach.losses}</td>
          <td class="coaches-conference-record">
            ${coach.conference_wins}-${coach.conference_losses}
          </td>
        </tr>
      `;
    })
    .join("");
}

export default init;