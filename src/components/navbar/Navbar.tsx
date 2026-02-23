import "./Navbar.css";
import octopusSvg from "../../assets/icons/octopus.svg";

export function Navbar() {
  return (
    <header className="top-nav">
      <a className="brand-wrap" href="/">
        <span className="brand-logo" aria-hidden>
          <img src={octopusSvg} alt="Octopus Logo" className="octopus-logo" />
        </span>
        <div>
          <p className="brand-name">BrainoTopus</p>
          <p className="brand-sub">Games</p>
        </div>
      </a>

      <nav aria-label="Primary navigation">
        <ul className="nav-links">
          <li>
            <a href="#games">Games</a>
          </li>
          <li>
            <a href="#about">About</a>
          </li>
          <li>
            <a href="#contact">Contact</a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
