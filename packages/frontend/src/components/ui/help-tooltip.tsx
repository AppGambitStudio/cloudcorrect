"use client"

import * as React from "react"
import { HelpCircle, Info, AlertCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type HelpTooltipVariant = "help" | "info" | "warning"

interface HelpTooltipProps {
  /** The help text to display */
  content: React.ReactNode
  /** Visual variant of the tooltip trigger */
  variant?: HelpTooltipVariant
  /** Size of the icon in pixels */
  iconSize?: number
  /** Additional class name for the trigger button */
  className?: string
  /** Additional class name for the tooltip content */
  contentClassName?: string
  /** Side where the tooltip should appear */
  side?: "top" | "right" | "bottom" | "left"
  /** Alignment of the tooltip relative to the trigger */
  align?: "start" | "center" | "end"
  /** Delay in ms before the tooltip appears */
  delayDuration?: number
  /** Maximum width of the tooltip content */
  maxWidth?: number
}

const iconMap = {
  help: HelpCircle,
  info: Info,
  warning: AlertCircle,
}

const variantStyles = {
  help: "text-slate-400 hover:text-slate-600",
  info: "text-blue-400 hover:text-blue-600",
  warning: "text-amber-400 hover:text-amber-600",
}

/**
 * HelpTooltip - A reusable tooltip component for displaying help text
 *
 * @example
 * // Basic usage
 * <HelpTooltip content="This is helpful information" />
 *
 * @example
 * // With custom variant and positioning
 * <HelpTooltip
 *   content="Warning: This action cannot be undone"
 *   variant="warning"
 *   side="right"
 * />
 *
 * @example
 * // With rich content
 * <HelpTooltip
 *   content={
 *     <div>
 *       <p className="font-semibold">Instance ID Format</p>
 *       <p className="mt-1">Must start with 'i-' followed by 8-17 hex characters</p>
 *     </div>
 *   }
 * />
 */
export function HelpTooltip({
  content,
  variant = "help",
  iconSize = 14,
  className,
  contentClassName,
  side = "top",
  align = "center",
  delayDuration = 200,
  maxWidth = 300,
}: HelpTooltipProps) {
  const Icon = iconMap[variant]

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
              variantStyles[variant],
              className
            )}
            aria-label="Help"
          >
            <Icon size={iconSize} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className={cn("max-w-xs", contentClassName)}
          style={{ maxWidth }}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * InlineHelpTooltip - A tooltip that can be used inline with text, typically for labels
 *
 * @example
 * <Label>
 *   Instance ID
 *   <InlineHelpTooltip content="The unique identifier for your EC2 instance" />
 * </Label>
 */
export function InlineHelpTooltip({
  content,
  variant = "help",
  iconSize = 12,
  className,
  ...props
}: HelpTooltipProps) {
  return (
    <HelpTooltip
      content={content}
      variant={variant}
      iconSize={iconSize}
      className={cn("ml-1 align-middle", className)}
      {...props}
    />
  )
}

/**
 * FieldHelpTooltip - A tooltip specifically designed for form field help
 * Includes styling that works well with Input components
 *
 * @example
 * <div className="relative">
 *   <Input placeholder="Enter value" />
 *   <FieldHelpTooltip content="Help text for this field" />
 * </div>
 */
export function FieldHelpTooltip({
  content,
  variant = "help",
  iconSize = 14,
  className,
  ...props
}: HelpTooltipProps) {
  return (
    <HelpTooltip
      content={content}
      variant={variant}
      iconSize={iconSize}
      className={cn("absolute right-3 top-1/2 -translate-y-1/2", className)}
      side="left"
      {...props}
    />
  )
}

interface TooltipWithTitleProps extends HelpTooltipProps {
  /** Title to display at the top of the tooltip */
  title: string
}

/**
 * TooltipWithTitle - A tooltip with a prominent title and description
 *
 * @example
 * <TooltipWithTitle
 *   title="Instance Running Check"
 *   content="Verifies that the specified EC2 instance is in the 'running' state."
 * />
 */
export function TooltipWithTitle({
  title,
  content,
  variant = "info",
  ...props
}: TooltipWithTitleProps) {
  return (
    <HelpTooltip
      content={
        <div className="space-y-1">
          <p className="font-semibold text-slate-100">{title}</p>
          <div className="text-slate-300">{content}</div>
        </div>
      }
      variant={variant}
      maxWidth={350}
      {...props}
    />
  )
}

export { type HelpTooltipVariant, type HelpTooltipProps }
