import * as React from "react"
import { cn } from "../../lib/utils"

/**
 * Container size variants
 */
export type ContainerSize = "sm" | "md" | "lg" | "xl" | "full"

/**
 * Props for the Container component
 */
export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Max width constraint */
  size?: ContainerSize
  /** Whether to center the container */
  centered?: boolean
  /** Whether to add horizontal padding */
  padded?: boolean
  /** Whether to center text content */
  textCenter?: boolean
}

/**
 * Container component for consistent page layouts
 * 
 * @example
 * ```tsx
 * <Container size="lg" padded>
 *   <p>Your content here</p>
 * </Container>
 * ```
 */
export function Container({
  className,
  size = "lg",
  centered = true,
  padded = true,
  textCenter = false,
  children,
  ...props
}: ContainerProps) {
  const sizes: Record<ContainerSize, string> = {
    sm: "max-w-2xl", // 672px
    md: "max-w-4xl", // 896px
    lg: "max-w-6xl", // 1152px
    xl: "max-w-7xl", // 1280px
    full: "max-w-full",
  }

  return (
    <div
      className={cn(
        "w-full",
        sizes[size],
        centered && "mx-auto",
        padded && "px-4 sm:px-6 lg:px-8",
        textCenter && "text-center",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Props for Section component
 */
export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Section size variant (controls padding) */
  size?: "sm" | "md" | "lg" | "xl"
  /** Background variant */
  background?: "default" | "muted" | "accent" | "transparent"
}

/**
 * Section component for page sections
 * 
 * @example
 * ```tsx
 * <Section size="lg" background="muted">
 *   <Container>
 *     Content here
 *   </Container>
 * </Section>
 * ```
 */
export function Section({
  className,
  size = "md",
  background = "default",
  children,
  ...props
}: SectionProps) {
  const sizes = {
    sm: "py-8 md:py-12",
    md: "py-12 md:py-16",
    lg: "py-16 md:py-24",
    xl: "py-24 md:py-32",
  }

  const backgrounds = {
    default: "bg-white dark:bg-slate-900",
    muted: "bg-slate-50 dark:bg-slate-800/50",
    accent: "bg-teal-50 dark:bg-teal-900/20",
    transparent: "bg-transparent",
  }

  return (
    <section
      className={cn(
        sizes[size],
        backgrounds[background],
        className
      )}
      {...props}
    >
      {children}
    </section>
  )
}

/**
 * Props for Stack component
 */
export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Direction of the stack */
  direction?: "horizontal" | "vertical"
  /** Gap size between items */
  gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl"
  /** Align items */
  align?: "start" | "center" | "end" | "stretch" | "baseline"
  /** Justify content */
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly"
}

/**
 * Stack component for flex layouts
 * 
 * @example
 * ```tsx
 * <Stack direction="horizontal" gap="md" align="center">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 * </Stack>
 * ```
 */
export function Stack({
  className,
  direction = "vertical",
  gap = "md",
  align = "stretch",
  justify = "start",
  children,
  ...props
}: StackProps) {
  const gaps = {
    none: "gap-0",
    xs: "gap-1",
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
    xl: "gap-8",
  }

  const aligns = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
    baseline: "items-baseline",
  }

  const justifies = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
    around: "justify-around",
    evenly: "justify-evenly",
  }

  return (
    <div
      className={cn(
        "flex",
        direction === "vertical" ? "flex-col" : "flex-row",
        gaps[gap],
        aligns[align],
        justifies[justify],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Props for Grid component
 */
export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns */
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12
  /** Gap size between items */
  gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl"
}

/**
 * Grid component for grid layouts
 * 
 * @example
 * ```tsx
 * <Grid cols={3} gap="md">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 * </Grid>
 * ```
 */
export function Grid({
  className,
  cols = 3,
  gap = "md",
  children,
  ...props
}: GridProps) {
  const colClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 md:grid-cols-2 lg:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
    12: "grid-cols-12",
  }

  const gaps = {
    none: "gap-0",
    xs: "gap-1",
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
    xl: "gap-8",
  }

  return (
    <div
      className={cn(
        "grid",
        colClasses[cols],
        gaps[gap],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
