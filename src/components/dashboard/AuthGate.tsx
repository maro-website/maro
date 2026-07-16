"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMaro } from "@/context/store";
import { Spinner } from "@/components/ui/Misc";

// Client-side guard for the simulated session. Redirects to sign-in when there
// is no fake session once the store has hydrated.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, user } = useMaro();
  const router = useRouter();

  React.useEffect(() => {
    if (ready && !user) router.replace("/sign-in");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  return <>{children}</>;
}
