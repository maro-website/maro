import { redirect } from "next/navigation";

// maro Fjalë is temporarily disabled for launch. Keep the route so links don't
// 404, but send visitors back to the hub. Re-enable by restoring the previous
// AssistantPanel-based page from git history.
export default function FjalePage() {
  redirect("/");
}
