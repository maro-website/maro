import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { parseRaiAcceptCheckout } from "./contract";

export interface RaiAcceptOrderState {
  order_id:string;user_id:string;environment:string;merchant_account_id:string;merchant_reference:string;provider_order_id:string|null;
  payment_state:string;fulfillment_state:string;review_reason:string|null;session_state:string;session_id:string|null;redirect_url:string|null;
  created_at:string;last_verified_at:string|null;
}
const COLUMNS="order_id,user_id,environment,merchant_account_id,merchant_reference,provider_order_id,payment_state,fulfillment_state,review_reason,session_state,session_id,redirect_url,created_at,last_verified_at";
export async function getRaiAcceptOrderState(userId:string,filter:{orderId?:string;requestKey?:string}):Promise<RaiAcceptOrderState|null> {
  let query=getSupabaseAdmin().from("raiaccept_checkouts").select(COLUMNS).eq("user_id",userId);
  if (filter.orderId) query=query.eq("order_id",filter.orderId);
  else if (filter.requestKey) query=query.eq("request_key",filter.requestKey);
  else return null;
  const {data,error}=await query.maybeSingle(); if (error) throw new Error("raiaccept_order_storage_unavailable");
  return data as RaiAcceptOrderState|null;
}
export function publicRaiAcceptState(state:RaiAcceptOrderState) {
  let redirectUrl:string|undefined;
  if (state.payment_state==="unverified" && state.session_state==="ready" && state.redirect_url && state.session_id) {
    redirectUrl=parseRaiAcceptCheckout({sessionId:state.session_id,paymentRedirectURL:state.redirect_url}).redirectUrl;
  }
  return {paymentState:state.payment_state,fulfillmentState:state.fulfillment_state,requiresReview:!!state.review_reason,
    lastVerifiedAt:state.last_verified_at,redirectUrl};
}
export async function listRaiAcceptSummaries(orderIds:string[],userId?:string) {
  const states=new Map<string,{paymentState:string;fulfillmentState:string;requiresReview:boolean;reviewReason:string|null;providerOrderId:string|null}>();
  if (!orderIds.length) return states;
  let query=getSupabaseAdmin().from("raiaccept_checkouts").select("order_id,payment_state,fulfillment_state,review_reason,provider_order_id").in("order_id",orderIds);
  if (userId) query=query.eq("user_id",userId);
  const {data,error}=await query;if (error) throw new Error("raiaccept_order_storage_unavailable");
  for(const row of data??[]) states.set(row.order_id,{paymentState:row.payment_state,fulfillmentState:row.fulfillment_state,
    requiresReview:!!row.review_reason,reviewReason:row.review_reason,providerOrderId:row.provider_order_id});
  return states;
}
