import { Suspense } from "react";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { RaiAcceptReturn } from "./RaiAcceptReturn";
export default function ReturnPage() {return <AuthGate><Suspense fallback={null}><RaiAcceptReturn/></Suspense></AuthGate>;}
