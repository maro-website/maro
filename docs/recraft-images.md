# Recraft image pilot

Recraft uses the existing maroImazh canonical prompt, durable jobs, private PNG gallery, credit reservation, settlement and reconciliation. The verified Supabase account email must be `erzen@nice.al`. The model list and generation resolver independently enforce this. Logout/session changes clear the promptbox model projection. Other accounts keep Flare/Sunburst and cannot request Recraft directly. maroLogo remains Flare.

Set server-only `RECRAFT_API_KEY` on the Railway **WEB** service. `RECRAFT_API_TOKEN` is also accepted. Missing keys fail before admission or credits. There are no automatic paid retries or OpenAI fallbacks.

Migration `0074_recraft_image_pilot.sql` seeds all **21 native API variants** with **5 customer credits**, without replacing existing rows/prices. Raster aliases are duplicates and are omitted. Recraft Studio's third-party models are not exposed by the native Recraft API. Source: [official catalog](https://www.recraft.ai/docs/api-reference/models/overview), including the eight [V4.1 variants](https://www.recraft.ai/docs/api-reference/models/recraft-v4-1#variants).

In Admin → Engine → maroImazh → Models & credits, edit each model's price, name, description, order and Enabled toggle, then save. Recraft cannot become the global default during the private pilot. Existing jobs retain their immutable configuration and price. The atomic save RPC remains service-role-only behind the existing MFA-protected admin API.

Provider capabilities are checked against the exact compiled prompt before any financial work:

- V4/V4.1/Flash/Styles accept 10,000 characters; V2/V3 accept 1,000, including platform instructions. Over-budget prompts are rejected intact and are never silently truncated.
- Standard V3/V4/V4.1 variants accept one input image through image-to-image, with strength 0.5. Multiple images are rejected explicitly.
- Styles variants require reference images and use them as style references. V2 references also transfer style. Flash accepts no references, including optional Brain image references.
- Vector output is sanitized and rasterized to PNG for the current image gallery; original SVG download is not part of this pilot. Pro raster results retain native resolution. Recraft gets the selected aspect ratio for text-to-image; image-to-image follows its source image dimensions.

The response's API units are recorded as Recraft telemetry. Customer credits are independent and remain editable. No OpenAI token rate or provider-reported USD is invented for Recraft; existing conservative cost fallback accounting remains labeled as an estimate.

The API key and a successful paid live generation are required before claiming provider end-to-end verification. Mock provider tests cover output validation, isolation, no retries, credit settlement and error handling. Migration tests run in isolated PostgreSQL-compatible PGlite.
