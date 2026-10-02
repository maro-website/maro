import { redirect } from "next/navigation";
export default function FavouritesPage() {
  redirect("/krijimet?category=saved");
}
