/**
 * Design Tokens for Daily Worker Hub
 * Typography scale, font weights, and line heights
 */

// Heading sizes (h1-h6)
export const headingStyles = {
  h1: {
    fontSize: "text-4xl md:text-5xl lg:text-6xl",
    fontWeight: "font-bold",
    lineHeight: "leading-tight",
    letterSpacing: "tracking-tight",
  },
  h2: {
    fontSize: "text-3xl md:text-4xl",
    fontWeight: "font-semibold",
    lineHeight: "leading-tight",
    letterSpacing: "tracking-tight",
  },
  h3: {
    fontSize: "text-2xl md:text-3xl",
    fontWeight: "font-semibold",
    lineHeight: "leading-snug",
    letterSpacing: "tracking-normal",
  },
  h4: {
    fontSize: "text-xl md:text-2xl",
    fontWeight: "font-medium",
    lineHeight: "leading-snug",
    letterSpacing: "tracking-normal",
  },
  h5: {
    fontSize: "text-lg md:text-xl",
    fontWeight: "font-medium",
    lineHeight: "leading-normal",
    letterSpacing: "tracking-normal",
  },
  h6: {
    fontSize: "text-base md:text-lg",
    fontWeight: "font-medium",
    lineHeight: "leading-normal",
    letterSpacing: "tracking-normal",
  },
} as const;

// Body text sizes
export const textStyles = {
  xs: {
    fontSize: "text-xs",
    lineHeight: "leading-relaxed",
  },
  sm: {
    fontSize: "text-sm",
    lineHeight: "leading-relaxed",
  },
  base: {
    fontSize: "text-base",
    lineHeight: "leading-relaxed",
  },
  lg: {
    fontSize: "text-lg",
    lineHeight: "leading-relaxed",
  },
  xl: {
    fontSize: "text-xl",
    lineHeight: "leading-relaxed",
  },
} as const;

// Font weights
export const fontWeights = {
  light: "font-light",
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
  extrabold: "font-extrabold",
} as const;

// Line heights
export const lineHeights = {
  none: "leading-none",
  tight: "leading-tight",
  snug: "leading-snug",
  normal: "leading-normal",
  relaxed: "leading-relaxed",
  loose: "leading-loose",
} as const;

// Spacing scale (for consistent padding/margins)
export const spacing = {
  0: "p-0",
  1: "p-1",
  2: "p-2",
  3: "p-3",
  4: "p-4",
  5: "p-5",
  6: "p-6",
  8: "p-8",
  10: "p-10",
  12: "p-12",
  16: "p-16",
} as const;

// Border radius scale
export const borderRadius = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
  full: "rounded-full",
} as const;

// Shadow scale
export const shadows = {
  none: "shadow-none",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
  "2xl": "shadow-2xl",
} as const;

// Transition durations
export const transitions = {
  fast: "duration-150",
  normal: "duration-200",
  slow: "duration-300",
  slower: "duration-500",
} as const;

// Z-index scale
export const zIndex = {
  dropdown: "z-10",
  sticky: "z-20",
  fixed: "z-30",
  modal: "z-40",
  popover: "z-50",
  tooltip: "z-50",
} as const;

// Type exports for use in components
export type HeadingLevel = keyof typeof headingStyles;
export type TextSize = keyof typeof textStyles;
export type FontWeight = keyof typeof fontWeights;
export type LineHeight = keyof typeof lineHeights;
