import Link from "next/link";
import { Layers3 } from "lucide-react";
export function Brand({ href = "/" }: { href?: string }) {
  return <Link href={href} className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight text-ink">
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white"><Layers3 size={22}/></span>
    <span>ContextOps <span className="text-brand">AI</span></span>
  </Link>;
}
