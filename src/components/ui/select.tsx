import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "../../lib/utils"

// Simple mock context to share value
const SelectContext = React.createContext<{
    value?: string;
    onValueChange?: (value: string) => void;
    open?: boolean;
    setOpen?: (open: boolean) => void;
}>({});

const Select = ({ children, value, onValueChange }: { children: React.ReactNode, value?: string, onValueChange?: (value: string) => void }) => {
    const [open, setOpen] = React.useState(false);
    return (
        <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
            <div className="relative inline-block w-full">{children}</div>
        </SelectContext.Provider>
    )
}

const SelectTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(SelectContext);
    return (
        <button
            ref={ref}
            type="button"
            onClick={() => setOpen?.(!open)}
            className={cn(
                "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        >
            {children}
            <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
    )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = React.forwardRef<
    HTMLSpanElement,
    React.HTMLAttributes<HTMLSpanElement> & { placeholder?: string }
>(({ className, placeholder, ...props }, ref) => {
    const { value } = React.useContext(SelectContext);
    // This is a naive implementation; ideally we'd map value to label
    // But for now let's just show placeholder if no value, or try to show value 
    // (Ideally SelectItem children should be hoisted but that's complex without Radix)
    return (
        <span
            ref={ref}
            className={cn("pointer-events-none block truncate", className)}
            {...props}
        >
            {props.children ? props.children :
                (value === 'all' ? 'Tất cả' :
                    value === 'today' ? 'Hôm nay' :
                        value === 'week' ? 'Tuần này' :
                            value === 'month' ? 'Tháng này' :
                                (value || placeholder))}
        </span>
    )
})
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(SelectContext);

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-50" onClick={() => setOpen?.(false)} />
            <div
                ref={ref}
                className={cn(
                    "absolute z-50 top-full mt-1 min-w-[8rem] overflow-hidden rounded-md border bg-white text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
                    className
                )}
                {...props}
            >
                <div className="p-1">{children}</div>
            </div>
        </>
    )
})
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, children, value: itemValue, ...props }, ref) => {
    const { value, onValueChange, setOpen } = React.useContext(SelectContext);
    const isSelected = value === itemValue;

    return (
        <div
            ref={ref}
            className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none hover:bg-slate-100 hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                isSelected ? "bg-slate-100 font-medium" : "",
                className
            )}
            onClick={(e) => {
                e.stopPropagation();
                onValueChange?.(itemValue);
                setOpen?.(false);
            }}
            {...props}
        >
            <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                {isSelected && <Check className="h-4 w-4" />}
            </span>
            <span className="truncate">{children}</span>
        </div>
    )
})
SelectItem.displayName = "SelectItem"

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
