import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
  });

  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("renders landing page with nav and game cards", () => {
    render(<App />);
    const primaryNav = screen.getByRole("navigation", {
      name: /primary navigation/i,
    });

    expect(
      screen.getByRole("heading", { name: /be dumb\. be octopus\./i }),
    ).toBeInTheDocument();

    expect(within(primaryNav).getByRole("link", { name: "Games" })).toHaveAttribute(
      "href",
      "/#games",
    );
    expect(within(primaryNav).getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/#about",
    );
    expect(within(primaryNav).getByRole("link", { name: "Contact" })).toHaveAttribute(
      "href",
      "/#contact",
    );

    expect(screen.getByRole("link", { name: /wordle/i })).toBeVisible();
    expect(screen.getAllByText(/developing/i)).toHaveLength(3);

    expect(
      screen.getByRole("heading", { name: /built for one more round\./i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /why i made it/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /contribution/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /contribute on github/i }),
    ).toHaveAttribute("href", "https://github.com/jonaDJ/BrainoTopus");
    expect(
      screen.getByRole("heading", { name: /reach out directly\./i }),
    ).toBeInTheDocument();
    const contactSection = screen.getByRole("region", { name: /contact links/i });
    expect(within(contactSection).getByRole("link", { name: /github/i })).toHaveAttribute(
      "href",
      "https://github.com/jonaDJ",
    );
    expect(screen.getByText(/linkedin and gmail are coming soon/i)).toBeInTheDocument();
  });
});
