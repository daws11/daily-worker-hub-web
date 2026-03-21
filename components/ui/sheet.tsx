"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
  asChild = false,
  children,
  className,
  ...props
}: SheetPrimitive.Trigger.Props & { asChild?: boolean; className?: string }) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...(children.props as React.HTMLAttributes<HTMLElement>),
      ...props,
      className: cn(
        className,
        (children.props as React.HTMLAttributes<HTMLElement>).className,
      ),
      "data-slot": "sheet-trigger",
    } as React.HTMLAttributes<HTMLElement>);
  }
  return (
    <SheetPrimitive.Trigger
      data-slot="sheet-trigger"
      className={className}
      {...props}
    >
      {children}
    </SheetPrimitive.Trigger>
  );
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 transition-all duration-300",
        "bg-black/40 supports-backdrop-filter:bg-black/20 supports-backdrop-filter:backdrop-blur-md",
        "data-open:animate-in data-open:fade-in-0",
        "data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
}) {
  const sideClasses = {
    top: "inset-x-0 top-0 h-auto max-h-[90vh] border-b rounded-b-2xl data-open:slide-in-from-top data-closed:slide-out-to-top",
    bottom: "inset-x-0 bottom-0 h-auto max-h-[90vh] border-t rounded-t-2xl data-open:slide-in-from-bottom data-closed:slide-out-to-bottom",
    left: "inset-y-0 left-0 h-full w-[85vw] max-w-sm border-r rounded-r-2xl data-open:slide-in-from-left data-closed:slide-out-to-left",
    right: "inset-y-0 right-0 h-full w-[85vw] max-w-sm border-l rounded-l-2xl data-open:slide-in-from-right data-closed:slide-out-to-right",
  };

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-background/95 supports-backdrop-filter:bg-background/80 supports-backdrop-filter:backdrop-blur-xl bg-clip-padding text-sm shadow-2xl transition-all duration-300 ease-out outline-none",
          sideClasses[side],
          "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
          "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className,
        )}
        {...props}
      >
        {/* Drag handle for mobile */}
        {(side === "top" || side === "bottom") && (
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
        )}
        
        {children}
        
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3 h-9 w-9 rounded-full hover:bg-muted touch-manipulation"
                size="icon"
              />
            }
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 px-6 pt-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-3 p-6 border-t bg-muted/30", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-lg font-semibold text-foreground tracking-tight", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
