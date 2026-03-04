import { useState } from "react";
import "./Navbar.css";
import octopusSvg from "../../assets/icons/octopus.svg";

type NavbarProps = {
  isRainEnabled: boolean;
  onToggleRain: () => void;
};

export function Navbar({ isRainEnabled, onToggleRain }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);
  const rainLabel = isRainEnabled ? "Rain on" : "Rain off";

  const renderRainToggle = (variant: "mobile" | "desktop") => (
    <button
      aria-label={isRainEnabled ? "Turn rain off" : "Turn rain on"}
      aria-pressed={isRainEnabled}
      className={`rain-toggle rain-toggle--${variant} ${isRainEnabled ? "rain-toggle--on" : "rain-toggle--off"}`}
      onClick={onToggleRain}
      title={rainLabel}
      type="button"
    >
      <span className="rain-toggle-text">Rain</span>
      <span aria-hidden className="rain-toggle-dot" />
    </button>
  );

  return (
    <header className={`top-nav ${isMenuOpen ? "top-nav--menu-open" : ""}`}>
      <div className="nav-row">
        <a className="brand-wrap" href="/" onClick={closeMenu}>
          <span className="brand-logo" aria-hidden>
            <img src={octopusSvg} alt="Octopus Logo" className="octopus-logo" />
          </span>
          <div>
            <p className="brand-name">BrainoTopus</p>
            <p className="brand-sub">Games</p>
          </div>
        </a>

        <div className="nav-actions">
          {renderRainToggle("mobile")}

          <button
            aria-controls="primary-nav-links"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="menu-toggle"
            onClick={() => setIsMenuOpen((prevOpen) => !prevOpen)}
            type="button"
          >
            <span className="menu-toggle-bar" />
            <span className="menu-toggle-bar" />
            <span className="menu-toggle-bar" />
          </button>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="primary-nav">
        <div className="primary-nav-inner">
          {renderRainToggle("desktop")}

          <ul
            className={`nav-links ${isMenuOpen ? "nav-links--open" : ""}`}
            id="primary-nav-links"
          >
            <li>
              <a href="/#games" onClick={closeMenu}>
                Games
              </a>
            </li>
            <li>
              <a href="/#about" onClick={closeMenu}>
                About
              </a>
            </li>
            <li>
              <a href="/#contact" onClick={closeMenu}>
                Contact
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
