import { CSSProperties, ElementType, ReactNode } from "react";
import { useReveal } from "@/hooks/useReveal";

interface RevealProps {
  as?: ElementType;
  /** Stagger delay in milliseconds */
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Fades + slides its children up as they enter the viewport.
 * Use `delay` (e.g. `index * 90`) on siblings to create the editorial
 * stagger effect on grids of cards.
 */
export default function Reveal({
  as: Tag = "div",
  delay = 0,
  className = "",
  style,
  children,
}: RevealProps) {
  const { ref, revealed } = useReveal<HTMLElement>();
  return (
    <Tag
      ref={ref as never}
      className={`reveal ${revealed ? "is-revealed" : ""} ${className}`.trim()}
      style={{ ...style, ["--reveal-delay" as never]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
