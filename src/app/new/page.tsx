import { redirect } from "next/navigation";

// The multi-step wizard is replaced by the single-screen composer on the home.
export default function NewRedirect() {
  redirect("/");
}
