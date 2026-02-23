import { RainLayer } from "./effects/rain/RainLayer";
import { Navbar } from "./components/navbar/Navbar";
import { WORDLEGAME } from "./pages/WORDLEGAME/WORDLEGAME";

type GameCard = {
  title: string;
  description: string;
  status: "available" | "developing";
  href?: string;
};

const gameCards: GameCard[] = [
  {
    title: "Wordle",
    description: "Daily five-letter puzzle.",
    status: "available",
    href: "/games/wordle",
  },
  {
    title: "Connections",
    description: "In development.",
    status: "developing",
  },
  {
    title: "Mini Crossword",
    description: "In development.",
    status: "developing",
  },
];

function App() {
  const isWordlePage = window.location.pathname === "/games/wordle";

  return (
    <div className="nyt-shell">
      <RainLayer />
      <Navbar />

      {isWordlePage ? (
        <WORDLEGAME />
      ) : (
        <main className="page-content">
          <section className="hero">
            <div className="hero-copy">
              <p className="hero-kicker rain-proof">NYT-style Puzzle Hub</p>
              <h1>Be Dumb. Be Octopus.</h1>
              <p>
                BrainoTopus is built for fast daily puzzle loops. Wordle is
                live, and new modes are on deck.
              </p>
            </div>
          </section>

          <section className="games-section" id="games">
            <h2>More Games</h2>

            <div className="game-grid">
              {gameCards.map((game) =>
                game.status === "available" ? (
                  <a
                    className="game-card game-card--live rain-proof"
                    href={game.href}
                    key={game.title}
                  >
                    <h3>{game.title}</h3>
                    <p>{game.description}</p>
                  </a>
                ) : (
                  <article
                    aria-disabled
                    className="game-card game-card--disabled rain-proof"
                    key={game.title}
                  >
                    <div className="card-head">
                      <h3>{game.title}</h3>
                      <span className="card-badge card-badge--dev">
                        Developing
                      </span>
                    </div>
                    <p>{game.description}</p>
                  </article>
                ),
              )}
            </div>
          </section>
        </main>
      )}

      <footer className="site-footer">
        <p id="about">Daily puzzle energy with octopus chaos.</p>
        <p id="contact">Contact: hello@brainotopus.dev</p>
      </footer>
    </div>
  );
}

export default App;
