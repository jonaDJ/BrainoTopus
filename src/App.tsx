import { useEffect, useState } from "react";
import { RainLayer } from "./effects/rain/RainLayer";
import { Navbar } from "./components/navbar/Navbar";
import { WORDLEGAME } from "./pages/WORDLEGAME/WORDLEGAME";
import { CONNECTION } from "./pages/CONNECTION/CONNECTION";
import { ABOUT } from "./pages/ABOUT/ABOUT";
import { CONTACT } from "./pages/CONTACT/CONTACT";
import wordleCardImage from "./assets/images/wordle.svg";
import connectionsCardImage from "./assets/images/connection.svg";

const RAIN_ENABLED_STORAGE_KEY = "brainotopus-rain-enabled";

type GameCard = {
  title: string;
  status: "available" | "developing";
  href?: string;
  imageSrc?: string;
};

const gameCards: GameCard[] = [
  {
    title: "Wordle",
    status: "available",
    href: "/games/wordle",
    imageSrc: wordleCardImage,
  },
  {
    title: "Connections",
    status: "available",
    href: "/games/connection",
    imageSrc: connectionsCardImage,
  },
  {
    title: "Mini Crossword",
    status: "developing",
  },
  {
    title: "Spelling Bee",
    status: "developing",
  },
  {
    title: "Sudoku",
    status: "developing",
  },
];

function getInitialRainEnabled() {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.localStorage.getItem(RAIN_ENABLED_STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

function App() {
  const [isRainEnabled, setIsRainEnabled] = useState(getInitialRainEnabled);
  const pathname = window.location.pathname;
  const isWordlePage = pathname === "/games/wordle";
  const isConnectionPage = pathname === "/games/connection";
  const activeGameTitle = isWordlePage
    ? "Wordle"
    : isConnectionPage
      ? "Connections"
      : null;

  useEffect(() => {
    try {
      window.localStorage.setItem(
        RAIN_ENABLED_STORAGE_KEY,
        isRainEnabled ? "1" : "0",
      );
    } catch {
      // Ignore storage write failures so the toggle still works in-memory.
    }
  }, [isRainEnabled]);

  return (
    <div className="nyt-shell">
      <RainLayer enabled={isRainEnabled} />
      <Navbar
        isRainEnabled={isRainEnabled}
        onToggleRain={() => setIsRainEnabled((prev) => !prev)}
      />

      {activeGameTitle ? (
        <>
          <section className="game-page-header">
            <h1 className="game-page-title">{activeGameTitle}</h1>
          </section>
          {isWordlePage ? <WORDLEGAME /> : <CONNECTION />}
        </>
      ) : (
        <main className="page-content">
          <section className="hero">
            <div className="hero-copy">
              <p className="hero-kicker rain-proof">NYT-style Puzzle Hub</p>
              <h1>Be Dumb. Be Octopus.</h1>
              <p className="hero-summary">
                BrainoTopus is built for fast daily puzzle loops. Wordle is
                live, and new modes are on deck.
              </p>
            </div>
          </section>

          <section className="games-section" id="games">
            <h2>Games</h2>

            <div className="game-grid">
              {gameCards.map((game) =>
                game.status === "available" ? (
                  <a
                    aria-label={`Open ${game.title}`}
                    className="game-card game-card--live rain-proof"
                    href={game.href}
                    key={game.title}
                  >
                    {game.imageSrc ? (
                      <img
                        alt=""
                        aria-hidden="true"
                        className="game-card-media"
                        src={game.imageSrc}
                      />
                    ) : null}
                    <div aria-hidden="true" className="game-card-scrim" />
                    <div className="game-card-content">
                      <h3>{game.title}</h3>
                    </div>
                  </a>
                ) : (
                  <article
                    aria-disabled
                    className="game-card game-card--disabled rain-proof"
                    key={game.title}
                  >
                    <div className="game-card-content">
                      <div className="card-head">
                        <span className="card-badge card-badge--dev">
                          Developing
                        </span>
                      </div>
                      <h3>{game.title}</h3>
                      <div className="game-card-meta">
                        <span>Coming Soon</span>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>

          <ABOUT />
          <CONTACT />
        </main>
      )}

      <footer className="site-footer">
        <nav aria-label="Footer navigation" className="site-footer-links">
          <a href="/#about">About</a>
          <a href="/#contact">Contact</a>
          <a
            href="https://github.com/jonaDJ/BrainoTopus"
            rel="noreferrer"
            target="_blank"
          >
            Contribute
          </a>
        </nav>
      </footer>
    </div>
  );
}

export default App;
