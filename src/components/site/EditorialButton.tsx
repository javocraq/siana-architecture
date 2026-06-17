import { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";

interface CommonProps {
  /** "primary" = ink underline (strong). "muted" = paper-mid underline (secondary).
   *  "invert" = white underline for dark backgrounds (e.g. over a hero image). */
  variant?: "primary" | "muted" | "invert";
  /** Renders the trailing arrow that grows on hover. */
  arrow?: boolean;
  /** Renders a leading arrow (e.g. ← Back). */
  leadingArrow?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

type LinkProps = CommonProps & {
  to: string;
  href?: never;
  onClick?: never;
  type?: never;
  disabled?: never;
};
type AnchorProps = CommonProps & {
  href: string;
  to?: never;
  onClick?: never;
  type?: never;
  disabled?: never;
};
type ButtonProps = CommonProps & {
  to?: never;
  href?: never;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

export type EditorialButtonProps = LinkProps | AnchorProps | ButtonProps;

/**
 * Site-wide editorial CTA. Mono-caps with a hairline underline and a trailing
 * arrow that expands on hover. Matches the "EXPLORE THE ATLAS →" treatment.
 *
 *   <EditorialButton to="/atlas" arrow>Explore the Atlas</EditorialButton>
 *   <EditorialButton to="/cities" variant="muted">Browse all cities</EditorialButton>
 *   <EditorialButton onClick={submit} type="submit" arrow>Sign Up</EditorialButton>
 */
export default function EditorialButton(props: EditorialButtonProps) {
  const {
    variant = "primary",
    arrow = false,
    leadingArrow = false,
    className = "",
    style,
    children,
  } = props;

  const borderColor =
    variant === "muted"
      ? "hsl(var(--paper-mid))"
      : variant === "invert"
        ? "#ffffff"
        : "hsl(var(--ink))";
  const textClass =
    variant === "muted"
      ? "text-ink-soft hover:text-ink"
      : variant === "invert"
        ? "text-white hover:opacity-80"
        : "text-ink hover:opacity-70";

  const baseClass =
    `group font-mono uppercase inline-flex items-center transition-all active:scale-[0.97] ` +
    `${arrow ? "hover:gap-3" : ""} ${textClass} ${className}`.trim();

  const mergedStyle: CSSProperties = {
    fontSize: "12px",
    letterSpacing: "0.28em",
    fontWeight: 500,
    gap: arrow || leadingArrow ? "0.6rem" : 0,
    borderBottom: `1px solid ${borderColor}`,
    paddingBottom: 4,
    ...style,
  };

  const content = (
    <>
      {leadingArrow && <span aria-hidden="true">←</span>}
      {children}
      {arrow && <span aria-hidden="true">→</span>}
    </>
  );

  if ("to" in props && props.to) {
    return (
      <Link to={props.to} className={baseClass} style={mergedStyle}>
        {content}
      </Link>
    );
  }
  if ("href" in props && props.href) {
    return (
      <a href={props.href} className={baseClass} style={mergedStyle}>
        {content}
      </a>
    );
  }
  return (
    <button
      type={(props as ButtonProps).type || "button"}
      onClick={(props as ButtonProps).onClick}
      disabled={(props as ButtonProps).disabled}
      className={baseClass}
      style={mergedStyle}
    >
      {content}
    </button>
  );
}
