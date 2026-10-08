export function raiAcceptPaymentMessage(paymentState:string,fulfillmentState:string,requiresReview:boolean) {
  if (paymentState==="fully_refunded") return {title:"Pagesa është rimbursuar",body:"Rimbursimi i plotë është konfirmuar nga banka. Detajet e planit dhe krediteve gjenden te llogaria."};
  if (paymentState==="partially_refunded") return {title:"Pagesa është rimbursuar pjesërisht",body:"Banka ka konfirmuar një rimbursim të pjesshëm. Për detaje na shkruaj në info@maro.al."};
  if (paymentState==="paid"&&fulfillmentState==="fulfilled"&&!requiresReview) return {title:"Pagesa u konfirmua",body:"Plani dhe kreditë e blera janë përditësuar në llogarinë tënde."};
  if (paymentState==="paid"||requiresReview||fulfillmentState==="manual_review") return {title:"Pagesa po shqyrtohet",body:"Pagesa është regjistruar dhe ekipi po kontrollon përmbushjen. Mos paguaj përsëri; na shkruaj në info@maro.al me numrin e porosisë."};
  if (paymentState==="unpaid") return {title:"Pagesa nuk u përfundua",body:"Banka e ka mbyllur këtë porosi pa pagesë të konfirmuar."};
  return {title:"Po verifikojmë pagesën",body:"Konfirmimi nga banka mund të marrë pak kohë. Mos nis një pagesë të dytë për këtë porosi."};
}
