/** Customer-safe descriptions for the durable V1 lifecycle. */
export const V1_IMAGE_ERRORS: Record<string, string> = {
  context_too_long: "Konteksti dhe udhëzimet e kërkesës e kalojnë hapësirën e disponueshme. Provo një preset ose kërkesë më të shkurtër.",
  optimizer_input_too_long: "Konteksti i zgjedhur është tepër i madh për përgatitje. Përdor më pak kontekst për këtë kërkesë.",
  optimizer_unavailable: "Përgatitja e kërkesës nuk përfundoi. Kreditet e gjenerimit nuk janë rezervuar. Provo përsëri më vonë.",
  optimizer_budget_limit: "Është arritur kufiri i përgatitjes së kërkesave për këtë periudhë. Provo më vonë.",
  optimizer_busy: "E njëjta kërkesë është duke u përgatitur. Prit pak para se të provosh përsëri.",
  recraft_style_reference_required: "Shto të paktën një imazh si referencë stili për këtë model Recraft.",
  recraft_references_unsupported: "Recraft Flash nuk përkrah imazhe referencë. Hiqi referencat ose zgjidh një model tjetër.",
  recraft_reference_limit: "Ky model Recraft përkrah vetëm një imazh për ndryshim. Përdor një referencë ose zgjidh Recraft Styles për referenca stili.",
  brain_plan_required: "maroBrain kërkon një plan maroStandard ose maroPro aktiv.",
  storage_quota_exceeded: "Ke arritur kufirin total të storage të planit tënd. Liro hapësirë ose ndrysho planin.",
  account_policy_unavailable: "Qasja dhe storage nuk u verifikuan. Provo përsëri më vonë.",
  prompt_too_long: "Përshkrimi është shumë i gjatë. Shkurtoje pak dhe provo përsëri.",
  recraft_prompt_too_long: "Kërkesa me këtë preset ose kontekst e kalon kufirin e Recraft. Zgjidh Flare ose Sunburst, ose përdor preset më të shkurtër.",
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
