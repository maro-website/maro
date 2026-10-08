"use client";
import { useEffect,useState } from "react";
import { useMaro } from "@/context/store";
export function useRaiAcceptAvailability() {
  const {user,getAccessToken}=useMaro(); const [enabled,setEnabled]=useState(false);
  useEffect(()=>{
    let stopped=false;
    void (async()=>{try {
      const token=await getAccessToken(); const response=await fetch("/api/payments/raiaccept/availability",{
        cache:"no-store",headers:token?{Authorization:`Bearer ${token}`}:{}});
      const data=await response.json(); if (!stopped) setEnabled(response.ok&&data.enabled===true);
    } catch {if (!stopped) setEnabled(false);}})();
    return ()=>{stopped=true;};
  },[user,getAccessToken]);
  return enabled;
}
