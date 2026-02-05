import * as React from "react"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"

const Dialog = ({
    open,
    onOpenChange,
    children,
}: {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: React.ReactNode
}) => {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center">
            {/* Overlay */}
            <div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in-0"
                onClick={() => onOpenChange?.(false)}
            />
            {/* Content Positioner */}
            <div className="z-50 w-full p-4 sm:p-0 flex justify-center">
                {children}
            </div>
        </div>
    )
}

const DialogContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { hideClose?: boolean }
>(({ className, children, hideClose, ...props }, ref) => {
    // We need to access the onClose from the parent Dialog, but since we are mocking, 
    // we can't easily access the context without Context API.
    // For simplicity in this fix, we will just render. 
    // If the close button is needed, we ideally need Context.
    // Let's add a simple Context.
    return (
        <div
            ref={ref}
            className={cn(
                "relative grid w-full max-w-lg gap-4 border bg-white p-6 shadow-lg duration-200 animate-in fade-in-0 zoom-in-95 sm:rounded-lg md:w-full",
                className
            )}
            {...props}
        >
            {children}
            {!hideClose && (
                <DialogCloseButton />
            )}
        </div>
    )
})
DialogContent.displayName = "DialogContent"

// Helper for close button which needs context safely
// To do this properly without Radix, we need a Context.
const DialogContext = React.createContext<{ onOpenChange?: (open: boolean) => void }>({})

const DialogWrapper = ({
    open,
    onOpenChange,
    children,
}: {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: React.ReactNode
}) => {
    if (!open) return null

    return (
        <DialogContext.Provider value={{ onOpenChange }}>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* Overlay */}
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                    onClick={() => onOpenChange?.(false)}
                />
                {/* Container */}
                <div className="z-50 flex justify-center w-full px-4">
                    {children}
                </div>
            </div>
        </DialogContext.Provider>
    )
}

const DialogCloseButton = () => {
    const { onOpenChange } = React.useContext(DialogContext);
    return (
        <button
            type="button"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            onClick={() => onOpenChange?.(false)}
        >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
        </button>
    )
}

const DialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-1.5 text-center sm:text-left",
            className
        )}
        {...props}
    />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
            className
        )}
        {...props}
    />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight",
            className
        )}
        {...props}
    />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
))
DialogDescription.displayName = "DialogDescription"

export {
    DialogWrapper as Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
}
