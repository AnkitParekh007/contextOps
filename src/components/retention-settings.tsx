"use client";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";

export function RetentionSettings({workspaceId,name,initialUntil}:{
  workspaceId:string;name:string;initialUntil:string|null;
}){
  const [until,setUntil]=useState<string|null>(initialUntil);
  const [days,setDays]=useState(30);
  const [confirmation,setConfirmation]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  async function save(mode:"schedule"|"cancel"){
    setBusy(true);setMessage("");setError("");
    try{
      const response=await fetch("/api/workspaces/"+workspaceId+"/retention",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({mode,...(mode==="schedule"?{days}:{}),confirmation}),
      });
      const body=await response.json();
      if(!response.ok)throw Error(body.error??"Could not change retention policy");
      setUntil(body.retentionUntil??null);setConfirmation("");
      setMessage(mode==="cancel"?"Workspace expiry canceled":
        "Automatic whole-workspace expiry scheduled.");
    }catch(e){setError(e instanceof Error?e.message:"Request failed");}
    finally{setBusy(false);}
  }
  return <div className="space-y-4 rounded-2xl border border-orange-200 bg-white p-7">
    <h2 className="text-lg font-bold">Workspace retention</h2>
    <p className="text-sm leading-relaxed text-slate-600">
      Optional, destructive expiration of the <strong>entire workspace</strong>, including traces,
      simulations, reports, and policies. The organization-level audit history remains.
      Backups and third-party copies are not deleted automatically.</p>
    <p className="text-sm font-semibold">Current expiry: {until?new Date(until).toLocaleString():
      "Not scheduled"}</p>
    <label className="block text-sm font-semibold">Days until expiry (7–90)
      <select className="mt-2 block w-full max-w-sm rounded-xl border border-slate-300 bg-white p-3"
        value={days} onChange={e=>setDays(Number(e.target.value))}>
        {[7,14,30,60,90].map(value=><option key={value} value={value}>{value} days</option>)}
      </select>
    </label>
    <label className="block text-sm font-semibold">
      Type EXPIRE {name} to schedule, or CANCEL EXPIRY {name} to cancel
      <Input className="mt-2" value={confirmation} onChange={e=>setConfirmation(e.target.value)}/>
    </label>
    <div className="flex flex-wrap gap-3">
      <Button type="button" variant="secondary" disabled={busy||confirmation!=="EXPIRE "+name}
        onClick={()=>void save("schedule")}>Schedule deletion</Button>
      <Button type="button" variant="secondary" disabled={busy||!until||confirmation!=="CANCEL EXPIRY "+name}
        onClick={()=>void save("cancel")}>Cancel expiry</Button>
    </div>
    {message&&<p role="status" className="text-sm text-brand">{message}</p>}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
