# ACTION NEEDED FROM ERZEN

Supabase OAuth, DCR, Maro consent, the private ChatGPT connection, account
resolution, MCP generation transport, and image rendering in ChatGPT have all
passed in the real UI.

The production brand-context fix is covered by automated provider-input tests.
One final visual check in the already-connected ChatGPT plugin is required
after the fixed Railway deployment:

> Use Maro to create a premium social media campaign image for my active brand.
> Make it cinematic, minimal and expensive-looking.

Expected: the concept is grounded in Fleet & Miles' canonical B2B automotive,
rent-a-car, fleet/reservation-management context. It must not substitute an
unrelated consumer brand, product category, industry or identity. The image
does not need to render the literal words “Fleet & Miles” when text is off.

Send back only the generated image or `PASS`. Do not change OAuth settings and
do not send tokens or secrets.
