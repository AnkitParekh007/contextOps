import { notFound } from "next/navigation";
import { WorkspaceConsole } from "@/components/workspace-console";
const sections=new Set([
  "overview","traces","imports","analysis","classifications","calculator","evaluations","policies",
  "shadow","reports","audit","reviews","settings",
]);
export default async function WorkspaceSection({params}:{
  params:Promise<{workspaceId:string;section:string}>}){
  const {workspaceId,section}=await params;
  if(!sections.has(section))notFound();
  return <WorkspaceConsole workspaceId={workspaceId} section={section}/>;
}
