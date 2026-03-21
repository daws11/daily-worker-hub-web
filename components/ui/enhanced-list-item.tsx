"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface EnhancedListItemProps {
  /** Avatar element or component */
  avatar?: React.ReactNode;
  /** Main title text */
  title: string;
  /** Secondary text below title */
  subtitle?: string;
  /** Tertiary description text */
  description?: string;
  /** Element to show at the start (left side before avatar) */
  leading?: React.ReactNode;
  /** Element to show at the end (right side) */
  trailing?: React.ReactNode;
  /** Badge element to show */
  badge?: React.ReactNode;
  /** Link href - renders as anchor */
  href?: string;
  /** Click handler - renders as button */
  onClick?: () => void;
  /** Additional class names */
  className?: string;
  /** Disable hover effects */
  disableHover?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

const sizeConfig = {
  sm: {
    container: "p-2.5 gap-2.5",
    avatar: "w-8 h-8 text-xs",
    title: "text-sm",
    subtitle: "text-xs",
    description: "text-xs",
  },
  md: {
    container: "p-3.5 gap-3",
    avatar: "w-10 h-10 text-sm",
    title: "text-base",
    subtitle: "text-sm",
    description: "text-sm",
  },
  lg: {
    container: "p-4 gap-4",
    avatar: "w-12 h-12 text-base",
    title: "text-lg",
    subtitle: "text-base",
    description: "text-base",
  },
};

export function EnhancedListItem({
  avatar,
  title,
  subtitle,
  description,
  leading,
  trailing,
  badge,
  href,
  onClick,
  className,
  disableHover = false,
  size = "md",
}: EnhancedListItemProps) {
  const config = sizeConfig[size];
  
  const Component = href ? "a" : onClick ? "button" : "div";
  
  const baseClasses = cn(
    "flex items-center w-full bg-card rounded-xl border border-border transition-all duration-200 touch-manipulation",
    config.container,
    !disableHover && (href || onClick) && [
      "hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5",
      "active:scale-[0.99]",
    ],
    onClick && "text-left cursor-pointer",
    className
  );

  const content = (
    <>
      {/* Leading element */}
      {leading && (
        <div className="shrink-0">{leading}</div>
      )}
      
      {/* Avatar */}
      {avatar && (
        <div className={cn("shrink-0", config.avatar)}>
          {avatar}
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className={cn("font-semibold truncate", config.title)}>
            {title}
          </h3>
          {badge && <span className="shrink-0">{badge}</span>}
        </div>
        {subtitle && (
          <p className={cn("text-muted-foreground truncate mt-0.5", config.subtitle)}>
            {subtitle}
          </p>
        )}
        {description && (
          <p className={cn("text-muted-foreground/80 truncate mt-1", config.description)}>
            {description}
          </p>
        )}
      </div>
      
      {/* Trailing element */}
      {trailing && (
        <div className="shrink-0 ml-2">{trailing}</div>
      )}
      
      {/* Default chevron for links */}
      {href && !trailing && (
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
      )}
    </>
  );

  if (href) {
    return (
      <a href={href} className={baseClasses}>
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClasses}>
        {content}
      </button>
    );
  }

  return (
    <div className={baseClasses}>
      {content}
    </div>
  );
}

// Utility function to create avatar with initials
export function AvatarInitials({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };
  
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn(
          "rounded-full object-cover ring-2 ring-background",
          sizeClasses[size]
        )}
      />
    );
  }
  
  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white font-semibold ring-2 ring-background",
        sizeClasses[size]
      )}
    >
      {initials}
    </div>
  );
}

export default EnhancedListItem;
