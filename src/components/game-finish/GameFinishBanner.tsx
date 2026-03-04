import "./GameFinishBanner.css";

type GameFinishBannerProps = {
  actionAriaLabel?: string;
  actionLabel: string;
  onAction: () => void;
  outcome: "won" | "lost";
  text: string;
  title: string;
};

export function GameFinishBanner({
  actionAriaLabel,
  actionLabel,
  onAction,
  outcome,
  text,
  title,
}: GameFinishBannerProps) {
  return (
    <div className={`game-finish game-finish--${outcome}`}>
      <h2 className="game-finish-title">{title}</h2>
      <p aria-live="polite" className="game-finish-text" role="status">
        {text}
      </p>
      <button
        aria-label={actionAriaLabel}
        className="game-finish-btn"
        onClick={onAction}
        type="button"
      >
        {actionLabel}
      </button>
    </div>
  );
}
