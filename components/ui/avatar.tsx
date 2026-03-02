import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        xs: "h-6 w-6 text-[10px]",
        sm: "h-8 w-8 text-xs",
        default: "h-10 w-10 text-sm",
        md: "h-12 w-12 text-base",
        lg: "h-16 w-16 text-lg",
        xl: "h-24 w-24 text-2xl",
      },
      variant: {
        default: "",
        ring: "ring-2 ring-offset-2 ring-ring",
        ghost: "opacity-60 hover:opacity-100",
        bordered: "border-2 border-border",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(avatarVariants({ size, variant }), className)}
      {...props}
    />
  )
)
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, alt, ...props }, ref) => (
  <img
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    alt={alt}
    {...props}
  />
))
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted font-medium",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback, avatarVariants }

/*
// Example Usage:

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Basic Avatar with Image
<Avatar>
  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
  <AvatarFallback>CN</AvatarFallback>
</Avatar>

// Initials Fallback
<Avatar>
  <AvatarFallback className="bg-primary text-primary-foreground">JD</AvatarFallback>
</Avatar>

// Different Sizes
<Avatar size="xs">
  <AvatarFallback>XS</AvatarFallback>
</Avatar>
<Avatar size="sm">
  <AvatarFallback>SM</AvatarFallback>
</Avatar>
<Avatar size="default">
  <AvatarFallback>DF</AvatarFallback>
</Avatar>
<Avatar size="md">
  <AvatarFallback>MD</AvatarFallback>
</Avatar>
<Avatar size="lg">
  <AvatarFallback>LG</AvatarFallback>
</Avatar>
<Avatar size="xl">
  <AvatarFallback>XL</AvatarFallback>
</Avatar>

// With Ring
<Avatar variant="ring">
  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
  <AvatarFallback>CN</AvatarFallback>
</Avatar>

// Bordered
<Avatar variant="bordered">
  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
  <AvatarFallback>CN</AvatarFallback>
</Avatar>

// User List
function UserList() {
  const users = [
    { name: "John Doe", image: "..." },
    { name: "Jane Smith", image: "..." },
    { name: "Bob Johnson" },
  ]

  return (
    <div className="flex -space-x-2">
      {users.map((user) => (
        <Avatar key={user.name} className="ring-2 ring-background">
          <AvatarImage src={user.image} alt={user.name} />
          <AvatarFallback>
            {user.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
      ))}
    </div>
  )
}

// Status Avatar
function StatusAvatar() {
  return (
    <div className="relative">
      <Avatar>
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
    </div>
  )
}

// Colored Fallbacks
function ColoredAvatar() {
  const colors = [
    "bg-red-500 text-white",
    "bg-blue-500 text-white",
    "bg-green-500 text-white",
    "bg-purple-500 text-white",
    "bg-orange-500 text-white",
  ]

  return (
    <div className="flex gap-2">
      {colors.map((color, i) => (
        <Avatar key={i}>
          <AvatarFallback className={color}>{i + 1}</AvatarFallback>
        </Avatar>
      ))}
    </div>
  )
}

// Clickable Avatar
function ClickableAvatar() {
  return (
    <Avatar
      className="cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => console.log("Avatar clicked")}
    >
      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  )
}
*/
