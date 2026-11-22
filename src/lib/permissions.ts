import { MemberRole } from "@prisma/client";
export function canWriteWorkspace(role: MemberRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}
export function canReadWorkspace(role: MemberRole): boolean {
  return ["OWNER", "ADMIN", "ANALYST", "VIEWER"].includes(role);
}
