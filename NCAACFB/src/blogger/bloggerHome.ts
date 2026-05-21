import "../style.css";

const app = document.querySelector<HTMLDivElement>("#blogger-app");

if (!app) {
  throw new Error("Could not find #blogger-app");
}

app.innerHTML = `
  <main class="blogger-page">
    <nav class="blogger-nav">
      <a href="/">NCAACFB</a>

      <div>
        <a href="/dynasty/">Dynasty</a>
        <a href="/blogger/">Blogger</a>
      </div>
    </nav>

    <section class="blogger-hero">
      <div class="blogger-hero-content">
        <p class="eyebrow">CFB26 Story Lab</p>
        <h1>Blogging Dramatizer</h1>
        <p class="blogger-copy">
          Turn plain game notes into headlines, recaps, rivalry blurbs, playoff stories,
          and dramatic sports articles for your dynasty universe.
        </p>

        <div class="blogger-actions">
          <a class="primary-button" href="/blogger/dramatizer/">Start Dramatizing</a>
          <a class="secondary-button" href="/blogger/posts/">View Posts</a>
        </div>
      </div>

      <aside class="writer-card">
        <p class="scoreboard-label">Writing Desk</p>
        <h2>Next Draft</h2>

        <div class="writer-row">
          <span>Mode</span>
          <strong>Game Recap</strong>
        </div>

        <div class="writer-row">
          <span>Tone</span>
          <strong>Broadcast Drama</strong>
        </div>

        <div class="writer-row">
          <span>Status</span>
          <strong>Awaiting Notes</strong>
        </div>
      </aside>
    </section>

    <section class="blogger-grid">
      <a class="blogger-card" href="/blogger/dramatizer/">
        <span class="card-kicker">Main Tool</span>
        <h2>Dramatizer</h2>
        <p>Paste raw game notes and turn them into a full sports-style recap.</p>
      </a>

      <a class="blogger-card" href="/blogger/headlines/">
        <span class="card-kicker">Title Forge</span>
        <h2>Headlines</h2>
        <p>Create punchy headlines for rivalry games, playoff upsets, and weekly stories.</p>
      </a>

      <a class="blogger-card" href="/blogger/editor/">
        <span class="card-kicker">Draft Room</span>
        <h2>Editor</h2>
        <p>Write, polish, and revise posts before saving or publishing them.</p>
      </a>

      <a class="blogger-card" href="/blogger/posts/">
        <span class="card-kicker">Archive</span>
        <h2>Posts</h2>
        <p>Browse saved articles, recaps, headlines, and dynasty chronicles.</p>
      </a>
    </section>

    <section class="blogger-panel">
      <div>
        <p class="eyebrow">Article Preview</p>
        <h2>From scoreboard to storyline</h2>
        <p>
          Later, this section can preview your latest generated recap, saved draft,
          or featured dynasty article.
        </p>
      </div>

      <div class="sample-article-card">
        <span>Sample Headline</span>
        <strong>“Trojans Weather the Tide, March Toward the Crown”</strong>
        <p>
          A placeholder for the kind of dramatic recap your app will eventually generate.
        </p>
      </div>
    </section>
  </main>
`;