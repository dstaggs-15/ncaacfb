import "../style.css";

const app = document.querySelector<HTMLDivElement>("#blogger-app");

if (!app) {
  throw new Error("Could not find #blogger-app");
}

app.innerHTML = `
  <main class="page">
    <h1>Hello from Blogging Dramatizer</h1>
    <p>This is the blogger home page.</p>

    <nav>
      <a href="/">Back to Home</a>
      <span> | </span>
      <a href="/dynasty/">Go to Dynasty</a>
    </nav>
  </main>
`;