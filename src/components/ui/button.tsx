import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
const variants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 disabled:pointer-events-none disabled:opacity-50",
  { variants: {
    variant: {
      default: "bg-brand text-white hover:bg-[#095f58]",
      secondary: "border border-slate-200 bg-white text-ink hover:bg-slate-50",
      ghost: "text-slate-600 hover:bg-slate-100",
    },
    size: { default: "px-5 py-3 text-sm", sm: "px-3.5 py-2 text-sm", lg: "px-6 py-3.5 text-base" },
  }, defaultVariants: { variant: "default", size: "default" } },
);
type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof variants>;
export function Button({ className, variant, size, ...props }: Props) {
  return <button className={cn(variants({ variant, size }), className)} {...props}/>;
}
