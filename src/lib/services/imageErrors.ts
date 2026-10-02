/** Customer-safe descriptions for the durable V1 lifecycle. */
export const V1_IMAGE_ERRORS: Record<string, string> = {
  brain_plan_required: "maroBrain kërkon një plan maroStandard ose maroPro aktiv.",
  storage_quota_exceeded: "Ke arritur kufirin total të storage të planit tënd. Liro hapësirë ose ndrysho planin.",
  account_policy_unavailable: "Qasja dhe storage nuk u verifikuan. Provo përsëri më vonë.",
  prompt_too_long: "Përshkrimi është shumë i gjatë. Shkurtoje pak dhe provo përsëri.",
  invalid_string: "Kërkesa nuk mund të përpunohet. Provo përsëri.",
  invalid_request: "Kërkesa nuk mund të përpunohet. Provo përsëri.",
  invalid_json: "Kërkesa nuk mund të përpunohet. Provo përsëri.",
  unknown_field: "Kërkesa nuk mund të përpunohet. Provo përsëri.",
  "missing-prompt": "Shkruaj një përshkrim dhe provo përsëri.",
  model_disabled: "Ky model nuk është më i disponueshëm. Zgjidh një model tjetër.",
  provider_failed: "Gjenerimi dështoi. Provo përsëri.",
  provider_output_invalid: "Nuk u kthye një imazh i vlefshëm. Rezervimi i krediteve është liruar.",
  storage_failed: "Imazhi nuk u ruajt. Rezervimi i krediteve është liruar.",
  history_failed: "Rezultati nuk u ruajt në historik. Rezervimi i krediteve është liruar.",
  settlement_pending: "Rezultati është ruajtur dhe pagesa me kredite po përfundohet. Kontrollo historikun; mos e gjenero përsëri ende.",
  reconciliation_pending: "Gjenerimi po verifikohet. Kontrollo historikun për rezultatin dhe kreditet; mos e gjenero përsëri ende.",
  module_unavailable: "Ky modul nuk është ende i disponueshëm.",
  invalid_image_reference: "Referenca e imazhit nuk është e vlefshme. Ngarkoje përsëri.",
  invalid_logo_answers: "Kontrollo përgjigjet e formularit dhe provo përsëri.",
  invalid_logo_content_answer: "Kontrollo fushat e kërkuara në formular.",
  request_configuration_unavailable: "Konfigurimi i gjenerimit nuk është i disponueshëm. Provo më vonë.",
};

/** Neither arbitrary server messages nor technical codes belong in the customer UI. */
export function imageErrorMessage(code: string, existing: Record<string, string> = {}): string {
  return V1_IMAGE_ERRORS[code] ?? existing[code] ?? "Kërkesa nuk mund të përpunohet. Provo përsëri.";
}
