import "../../style.css";
import "./coaches.css";
import coachesHtml from "./coaches.html?raw";

import { supabase } from "../../supabase";
import { getAllDynasties } from "../dynastyData";

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

async function init() {
  const app = document.querySelector<HTMLDivElement>("#app")!;

  app.innerHTML = coachesHtml;

  const dynastyNameEl = document.querySelector<HTMLHeadingElement>(
    "#coaches-dynasty-name"
  );

  const tableBody = document.querySelector<HTMLTableSectionElement>(
    "#coaches-table-body"
  );

  if (!dynastyNameEl || !tableBody) {
    console.error("Coaches page elements were not found.");
    return;
  }

  const dynasties = await getAllDynasties();
  const activeDynasty = dynasties[0];

  if (!activeDynasty) {
    app.innerHTML = `
      <main class="coaches-page">
        <p class="coaches-empty-row">No dynasty found.</p>
      </main>
    `;
    return;
  }

  dynastyNameEl.textContent = activeDynasty.name;

  const { data: records, error } = await supabase
    .from("coaches")
    .select(`
      *,
      profiles:profile_id (
        username
      )
    `)
    .eq("dynasty_id", activeDynasty.id)
    .order("wins", { ascending: false });

  if (error) {
    console.error("Error loading coach records:", error);

    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="coaches-empty-row">
          Could not load coach records.
        </td>
      </tr>
    `;
    return;
  }

  const coachRecords = (records ?? []) as CoachRecord[];

  if (coachRecords.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="coaches-empty-row">
          No coach records yet.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = coachRecords
    .map((record) => {
      const coachName = record.profiles?.username ?? "Unknown";

      return `
        <tr>
          <td>${coachName}</td>
          <td>${record.team}</td>
          <td class="coaches-record">${record.wins}-${record.losses}</td>
          <td class="coaches-conference-record">
            ${record.conference_wins}-${record.conference_losses}
          </td>
        </tr>
      `;
    })
    .join("");
}

export default init;