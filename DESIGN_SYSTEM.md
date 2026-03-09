# Daily Worker Hub - Design System

A Vercel-inspired design system built with shadcn/ui. Clean, minimal, monochrome with dark mode as a first-class citizen.

## Design Principles

- **Monochrome First**: Black, white, and grays as the primary palette
- **Dark Mode Native**: Dark mode is not an afterthought - it's a first-class experience
- **Minimal Borders**: Subtle 1px borders with low opacity
- **Subtle Shadows**: Minimal elevation, clean cards
- **Tight Spacing**: Consistent 4px grid system
- **Inter Font**: Clean, modern typography

---

## Color Palette

### Light Mode

| Token | HSL Value | Usage |
|-------|-----------|-------|
| `--background` | `0 0% 100%` | Page background (white) |
| `--foreground` | `0 0% 3.9%` | Primary text (near black) |
| `--card` | `0 0% 100%` | Card backgrounds |
| `--card-foreground` | `0 0% 3.9%` | Card text |
| `--primary` | `0 0% 9%` | Primary buttons, important elements |
| `--primary-foreground` | `0 0% 98%` | Text on primary |
| `--secondary` | `0 0% 96.1%` | Secondary backgrounds |
| `--secondary-foreground` | `0 0% 9%` | Text on secondary |
| `--muted` | `0 0% 96.1%` | Muted backgrounds |
| `--muted-foreground` | `0 0% 45.1%` | Muted text, placeholders |
| `--accent` | `0 0% 96.1%` | Accent backgrounds |
| `--accent-foreground` | `0 0% 9%` | Text on accent |
| `--destructive` | `0 84.2% 60.2%` | Error states, delete actions |
| `--border` | `0 0% 89.8%` | Border color |
| `--input` | `0 0% 89.8%` | Input borders |
| `--ring` | `0 0% 3.9%` | Focus ring |

### Dark Mode

| Token | HSL Value | Usage |
|-------|-----------|-------|
| `--background` | `0 0% 3.9%` | Page background (near black) |
| `--foreground` | `0 0% 98%` | Primary text (white) |
| `--card` | `0 0% 3.9%` | Card backgrounds |
| `--primary` | `0 0% 98%` | Primary buttons (white) |
| `--primary-foreground` | `0 0% 9%` | Text on primary (black) |
| `--secondary` | `0 0% 14.9%` | Secondary backgrounds |
| `--muted` | `0 0% 14.9%` | Muted backgrounds |
| `--muted-foreground` | `0 0% 63.9%` | Muted text |
| `--border` | `0 0% 14.9%` | Border color |
| `--ring` | `0 0% 83.1%` | Focus ring |

### Semantic Colors

| Token | Usage |
|-------|-------|
| `--success` | `142 76% 36%` - Success states, confirmations |
| `--warning` | `38 92% 50%` - Warning states, cautions |
| `--info` | `217 91% 60%` - Information states |

---

## Typography

### Font Family

```css
font-family: "Inter", system-ui, sans-serif;
```

Inter is loaded via `next/font/google` for optimal performance.

### Type Scale

| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 12px | Captions, labels |
| `text-sm` | 14px | Body small, secondary text |
| `text-base` | 16px | Body text |
| `text-lg` | 18px | Large body, lead text |
| `text-xl` | 20px | Headings level 4 |
| `text-2xl` | 24px | Headings level 3 |
| `text-3xl` | 30px | Headings level 2 |
| `text-4xl` | 36px | Headings level 1 |

### Font Weights

- `font-normal` (400): Body text
- `font-medium` (500): Emphasized text, labels
- `font-semibold` (600): Headings
- `font-bold` (700): Strong emphasis

---

## Spacing

Based on a 4px grid system:

| Token | Value |
|-------|-------|
| `1` | 4px |
| `2` | 8px |
| `3` | 12px |
| `4` | 16px |
| `5` | 20px |
| `6` | 24px |
| `8` | 32px |
| `10` | 40px |
| `12` | 48px |
| `16` | 64px |

---

## Border Radius

Uses CSS variable for consistency:

| Token | Value |
|-------|-------|
| `--radius` | `0.5rem` (8px) |
| `rounded-sm` | `calc(var(--radius) - 4px)` = 4px |
| `rounded-md` | `calc(var(--radius) - 2px)` = 6px |
| `rounded-lg` | `var(--radius)` = 8px |

---

## Components

### Button

```tsx
import { Button } from "@/components/ui/button"

// Variants
<Button>Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon</Button>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
  <CardFooter>
    Footer content
  </CardFooter>
</Card>
```

### Input

```tsx
import { Input } from "@/components/ui/input"

<Input type="text" placeholder="Enter text..." />
```

### Dialog

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog description</DialogDescription>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

### Badge

```tsx
import { Badge } from "@/components/ui/badge"

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
```

### Avatar

```tsx
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

<Avatar>
  <AvatarImage src="/avatar.png" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

### Tabs

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### Dropdown Menu

```tsx
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"

<DropdownMenu>
  <DropdownMenuTrigger>Open</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Item 1</DropdownMenuItem>
    <DropdownMenuItem>Item 2</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Tooltip

```tsx
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

// Wrap app with TooltipProvider in layout.tsx
<Tooltip>
  <TooltipTrigger>Hover me</TooltipTrigger>
  <TooltipContent>Tooltip content</TooltipContent>
</Tooltip>
```

### Toast (Sonner)

```tsx
import { toast } from "sonner"

toast.success("Success message")
toast.error("Error message")
toast.info("Info message")
```

---

## Dark Mode

Dark mode is handled via `next-themes`. The theme is controlled by adding/removing the `.dark` class on the `<html>` element.

### Theme Toggle

```tsx
import { useTheme } from "next-themes"

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  
  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      Toggle Theme
    </button>
  )
}
```

### Theme Provider Setup

```tsx
import { ThemeProvider } from "next-themes"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      {children}
    </ThemeProvider>
  )
}
```

---

## Best Practices

### 1. Use Semantic Colors Sparingly

- Use `destructive` for dangerous actions (delete, remove)
- Use semantic colors (`success`, `warning`, `info`) for status indicators only
- Keep primary interactions in monochrome

### 2. Maintain Visual Hierarchy

- Use size and weight for hierarchy, not color
- Keep important elements in high contrast
- Use muted colors for secondary information

### 3. Consistent Spacing

- Always use Tailwind spacing utilities
- Group related elements with consistent gaps
- Use padding for internal component spacing

### 4. Accessible Focus States

- All interactive elements should have visible focus rings
- Use the built-in `ring` utilities
- Never remove focus styles without providing alternatives

### 5. Responsive Design

- Mobile-first approach
- Use Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`)
- Test in both light and dark modes

---

## File Structure

```
components/
├── ui/
│   ├── alert.tsx
│   ├── alert-dialog.tsx
│   ├── aspect-ratio.tsx
│   ├── avatar.tsx
│   ├── badge.tsx
│   ├── button.tsx
│   ├── calendar.tsx
│   ├── card.tsx
│   ├── checkbox.tsx
│   ├── command.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── form.tsx
│   ├── input.tsx
│   ├── input-group.tsx
│   ├── label.tsx
│   ├── popover.tsx
│   ├── progress.tsx
│   ├── radio-group.tsx
│   ├── scroll-area.tsx
│   ├── select.tsx
│   ├── separator.tsx
│   ├── sheet.tsx
│   ├── skeleton.tsx
│   ├── slider.tsx
│   ├── switch.tsx
│   ├── table.tsx
│   ├── tabs.tsx
│   ├── textarea.tsx
│   ├── toggle.tsx
│   ├── toggle-group.tsx
│   └── tooltip.tsx
└── ...

lib/
└── utils.ts         # cn() utility for class merging

app/
└── globals.css      # CSS variables and custom styles
```

---

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Inter Font](https://rsms.me/inter/)
- [Vercel Design](https://vercel.com/design)
