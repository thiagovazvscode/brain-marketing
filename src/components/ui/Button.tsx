"use client";

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

interface SharedProps {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  className?: string;
  children: ReactNode;
}

type ConflictingHandlers =
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration";

type ButtonAsButton = SharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, ConflictingHandlers> & {
    href?: undefined;
  };

type ButtonAsAnchor = SharedProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, ConflictingHandlers> & {
    href: string;
    external?: boolean;
  };

type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const baseClasses =
  "group relative inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-50 disabled:pointer-events-none";

const sizeClasses: Record<Size, string> = {
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand-primary text-ink shadow-[0_0_0_1px_rgba(124,58,237,0.4),0_18px_40px_-16px_rgba(124,58,237,0.55)] hover:bg-[#c084fc] hover:shadow-[0_0_0_1px_rgba(124,58,237,0.6),0_22px_50px_-14px_rgba(124,58,237,0.75)]",
  secondary:
    "border border-brand-primary/50 text-ink bg-elevated/40 hover:border-brand-primary hover:bg-elevated",
  ghost: "text-ink/80 hover:text-ink",
};

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    icon: Icon,
    iconPosition = "right",
    className,
    children,
    ...rest
  } = props;

  const classes = cn(baseClasses, sizeClasses[size], variantClasses[variant], className);

  const content = (
    <>
      {Icon && iconPosition === "left" && (
        <Icon className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" aria-hidden="true" />
      )}
      <span>{children}</span>
      {Icon && iconPosition === "right" && (
        <Icon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
      )}
    </>
  );

  if ("href" in props && props.href) {
    const { href, external, ...anchorRest } = rest as Omit<
      AnchorHTMLAttributes<HTMLAnchorElement>,
      ConflictingHandlers
    > & {
      external?: boolean;
    };
    return (
      <motion.a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className={classes}
        {...anchorRest}
      >
        {content}
      </motion.a>
    );
  }

  const buttonRest = rest as Omit<ButtonHTMLAttributes<HTMLButtonElement>, ConflictingHandlers>;

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={classes}
      {...buttonRest}
    >
      {content}
    </motion.button>
  );
}
