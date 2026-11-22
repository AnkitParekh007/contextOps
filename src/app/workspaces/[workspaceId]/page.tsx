import { redirect } from "next/navigation";
export default async function WorkspaceHome({params}:{params:Promise<{workspaceId:string}>}){
  redirect("/workspaces/"+(await params).workspaceId+"/overview");
}
