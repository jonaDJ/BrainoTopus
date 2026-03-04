const githubContact = {
  label: "GitHub",
  href: "https://github.com/jonaDJ",
  note: "Code, issues, pull requests",
  value: "github.com/jonaDJ",
};

export function CONTACT() {
  return (
    <section
      aria-labelledby="contact-title"
      className="contact-band"
      id="contact"
    >
      <div className="contact-band-copyblock">
        <p className="storyband-kicker">Contact</p>
        <h2 className="contact-band-title" id="contact-title">
          Reach out directly.
        </h2>
        <p className="contact-band-copy">
          GitHub is the live contact point for the project right now. If you
          want to report bugs, suggest games, or contribute, start there.
        </p>
        <p className="contact-band-soon">LinkedIn and Gmail are coming soon.</p>
      </div>

      <section className="contact-links" aria-label="Contact links">
        <a
          className="contact-spotlight rain-proof"
          href={githubContact.href}
          rel="noreferrer"
          target="_blank"
        >
          <span className="contact-label">{githubContact.label}</span>
          <strong>{githubContact.value}</strong>
          <span className="contact-note">{githubContact.note}</span>
        </a>
      </section>
    </section>
  );
}
