const repoUrl = "https://github.com/jonaDJ/BrainoTopus";
const contributionAreas = [
  "More games",
  "Testing",
  "Bug fixes",
  "UI polish",
];

export function ABOUT() {
  return (
    <section
      aria-labelledby="about-title"
      className="storyband"
      id="about"
    >
      <div className="storyband-grid">
        <div className="storyband-intro">
          <p className="storyband-kicker">About BrainoTopus</p>
          <h2 className="storyband-title" id="about-title">
            Built for one more round.
          </h2>
          <p className="storyband-lead">
            I enjoy NYT games and similar puzzle games. Daily limits make sense
            for a newspaper cadence, but I usually want to play more than once.
          </p>
          <p className="storyband-prompt">
            Great for a daily paper. Not enough for a game night.
          </p>
        </div>

        <div className="storyband-stack">
          <article className="storyband-card rain-proof">
            <h3 className="storyband-section-title">Why I made it</h3>
            <p className="storyband-headline">
              Same puzzle energy, no forced stop.
            </p>
            <p>
              The idea kept coming up when I was playing with friends and
              family. We were using it as entertainment, finished the daily
              puzzle, and immediately wanted another one.
            </p>
            <p>
              That is what BrainoTopus is for: NYT-style game loops without
              stopping at a single daily puzzle. Same quick format, more
              chances to keep playing.
            </p>
          </article>

          <article className="storyband-card storyband-card--accent rain-proof">
            <h3 className="storyband-section-title">Contribution</h3>
            <p className="storyband-headline">Help push it past the first puzzle.</p>
            <p>
              If you want to contribute, build with me. More games, stronger
              testing, cleaner edge-case handling, UI polish, and better puzzle
              flows are all useful here.
            </p>
            <div className="storyband-tags" aria-label="Contribution areas">
              {contributionAreas.map((area) => (
                <span className="storyband-tag" key={area}>
                  {area}
                </span>
              ))}
            </div>
            <a
              className="storyband-link"
              href={repoUrl}
              rel="noreferrer"
              target="_blank"
            >
              Contribute on GitHub
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}
