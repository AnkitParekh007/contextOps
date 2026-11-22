"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
export function LogoutButton() {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  return <button disabled={busy} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-ink disabled:opacity-40"
    onClick={async () => {
      setBusy(true);
      try {
        const res = await fetch("/api/auth/logout", { method: "POST" });
        if (res.ok) { router.replace("/login"); router.refresh(); }
      } finally { setBusy(false); }
    }}><LogOut size={16}/> Sign out</button>;
}
