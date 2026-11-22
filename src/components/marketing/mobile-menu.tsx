"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { navigation } from "@/lib/marketing-content";

export function MobileMenu(){
  const [open,setOpen]=useState(false);
  return <div className="mobile-menu">
    <button type="button" aria-label={open?"Close navigation":"Open navigation"} aria-expanded={open}
      aria-controls="mobile-marketing-navigation" className="mkt-icon-button" onClick={()=>setOpen(v=>!v)}>
      {open?<X size={22}/>:<Menu size={22}/>}
    </button>
    {open&&<div id="mobile-marketing-navigation" className="mkt-mobile-panel">
      {navigation.map(item=><Link key={item.href} href={item.href} onClick={()=>setOpen(false)}>{item.label}</Link>)}
      <Link href="/login" onClick={()=>setOpen(false)}>Sign in</Link>
      <Link href="/register" onClick={()=>setOpen(false)} className="mkt-mobile-cta">Start a workspace <ArrowRight size={16}/></Link>
    </div>}
  </div>;
}
