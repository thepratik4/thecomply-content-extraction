import * as React from "react"
import "./item.css"

export interface ItemProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "muted"
  size?: "default" | "sm" | "xs"
  className?: string
}

export const Item = React.forwardRef<HTMLDivElement, ItemProps>(
  ({ className = "", variant = "default", size = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`ui-item ui-item--${variant} ui-item--${size} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Item.displayName = "Item"

export interface ItemMediaProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "icon" | "avatar" | "image"
  className?: string
}

export const ItemMedia = React.forwardRef<HTMLDivElement, ItemMediaProps>(
  ({ className = "", variant = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`ui-item-media ui-item-media--${variant} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ItemMedia.displayName = "ItemMedia"

export interface ItemContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export const ItemContent = React.forwardRef<HTMLDivElement, ItemContentProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`ui-item-content ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ItemContent.displayName = "ItemContent"

export interface ItemTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  className?: string
}

export const ItemTitle = React.forwardRef<HTMLHeadingElement, ItemTitleProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`ui-item-title ${className}`}
        {...props}
      >
        {children}
      </p>
    )
  }
)
ItemTitle.displayName = "ItemTitle"

export interface ItemDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string
}

export const ItemDescription = React.forwardRef<HTMLParagraphElement, ItemDescriptionProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`ui-item-description ${className}`}
        {...props}
      >
        {children}
      </p>
    )
  }
)
ItemDescription.displayName = "ItemDescription"
