import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "quiet";
  size?: "md" | "sm";
}

/** Knappen för handlingar. Etiketten säger exakt vad som händer. Primary högst en per vy. */
export function Button({ variant = "secondary", size = "md", className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} {...rest} className={cx("ta-btn", `ta-btn-${variant}`, size === "sm" && "ta-btn-sm", className)} />;
}
