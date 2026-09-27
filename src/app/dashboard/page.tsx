import { redirect } from "next/navigation";

// The dashboard is merged into the app home (composer + projects sidebar).
export default function DashboardRedirect() {
  redirect("/");
}
