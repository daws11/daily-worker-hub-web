import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const switchVariants = cva(
  "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        default: "h-6 w-11",
        sm: "h-5 w-9",
        lg: "h-7 w-13",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const switchThumbVariants = cva(
  "pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform",
  {
    variants: {
      size: {
        default: "h-5 w-5 data-[state=checked]:translate-x-5",
        sm: "h-4 w-4 data-[state=checked]:translate-x-4",
        lg: "h-6 w-6 data-[state=checked]:translate-x-6",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>,
    VariantProps<typeof switchVariants> {
  label?: string
  description?: string
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, size, checked, defaultChecked, onCheckedChange, label, description, id, ...props }, ref) => {
  const switchId = id || `switch-${React.useId()}`

  return (
    <div className={cn(label && "flex items-center space-x-3")}>
      <SwitchPrimitives.Root
        ref={ref}
        className={cn(
          switchVariants({ size, className }),
          "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
        )}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        {...props}
      >
        <SwitchPrimitives.Thumb
          className={cn(
            switchThumbVariants({ size }),
            "data-[state=checked]:translate-x-full"
          )}
        />
      </SwitchPrimitives.Root>
      {(label || description) && (
        <div className="grid gap-1.5 leading-none">
          {label && (
            <label
              htmlFor={switchId}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-[13px] text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  )
})
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch, switchVariants, switchThumbVariants }

/*
// Example Usage:

import { Switch } from "@/components/ui/switch"

// Basic Switch
<Switch />

// Controlled Switch
function ControlledSwitchExample() {
  const [checked, setChecked] = useState(false)

  return (
    <Switch
      checked={checked}
      onCheckedChange={setChecked}
    />
  )
}

// With Default Value
<Switch defaultChecked />

// With Label
<Switch label="Enable notifications" />

// With Description
<Switch
  label="Email notifications"
  description="Receive daily updates via email"
/>

// Different Sizes
<Switch size="sm" label="Small" />
<Switch size="default" label="Default" />
<Switch size="lg" label="Large" />

// Disabled
<Switch disabled label="Disabled option" />

// Form Integration
function SettingsForm() {
  return (
    <div className="space-y-4">
      <Switch
        label="Dark mode"
        description="Enable dark theme across the app"
        defaultChecked
      />
      <Switch
        label="Push notifications"
        description="Get notified about new messages"
      />
      <Switch
        label="Email digest"
        description="Receive weekly summary emails"
      />
    </div>
  )
}

// With Custom Styling
<Switch
  className="data-[state=checked]:bg-green-500"
  label="Online status"
/>

// Toggle Group
function ToggleGroup() {
  const [settings, setSettings] = useState({
    notifications: true,
    emails: false,
    marketing: true,
  })

  return (
    <div className="space-y-4">
      {Object.entries(settings).map(([key, value]) => (
        <Switch
          key={key}
          checked={value}
          onCheckedChange={(checked) =>
            setSettings({ ...settings, [key]: checked })
          }
          label={key.charAt(0).toUpperCase() + key.slice(1)}
        />
      ))}
    </div>
  )
}

// With Change Handler
function SwitchWithHandler() {
  const handleChange = (checked: boolean) => {
    console.log("Switch changed to:", checked)
    // Add your logic here
  }

  return (
    <Switch
      onCheckedChange={handleChange}
      label="Feature toggle"
    />
  )
}

// Compact (No label)
function CompactSwitch() {
  const [active, setActive] = useState(true)

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={active}
        onCheckedChange={setActive}
        size="sm"
      />
      <span className="text-sm">{active ? "On" : "Off"}</span>
    </div>
  )
}
*/
