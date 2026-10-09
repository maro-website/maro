# Email readiness without new infrastructure

The 9 October audit observed Zoho EU root MX/SPF, Resend DKIM and the existing sending subdomain. Root DMARC was `v=DMARC1; p=none;`. No DNS record or mailbox was changed and no test email was sent during this implementation.

## Existing sender checks

Use mail already received where possible. Check the raw headers of an account-confirmation message, password-reset message, RaiAccept receipt and a support reply. Include representative Gmail, Outlook and Zoho inboxes. Record inbox/spam placement and `Authentication-Results`, with `dmarc=pass` and aligned SPF or DKIM for the visible From domain. Check the exact Zoho DKIM selector from the Zoho admin console; its name cannot be inferred from the Resend selector. A provider's "sent" status is not evidence of receipt or placement.

Check Zoho's DMARC reports for every legitimate sender before enforcing a policy. Keep the existing root Zoho MX/SPF and Resend sending-subdomain records. Avoid adding a second root SPF record or merging unrelated MX records.

## Prepared DNS change

After alignment is demonstrated for Zoho support mail and Resend transactional/auth mail, change the **single existing TXT record** at `_dmarc.maro.al` to:

```text
v=DMARC1; p=quarantine; adkim=r; aspf=r;
```

Check legitimate delivery and available reports, then move the policy to `p=reject` after the observed legitimate sender set passes. If using aggregate reporting, add `rua=mailto:...` only for an existing mailbox the owner has explicitly designated for reports; do not invent a new inbox/service or expose customer reports publicly. Retain relaxed alignment initially because the existing sending subdomain can legitimately differ from the root From domain.

If legitimate mail starts failing, restore the saved TXT record and repair the failing sender's DKIM/SPF alignment before enforcing again. Save the previous record, propagation/readback evidence and received headers with private credentials/message contents redacted.

**Remaining external evidence:** access to the DNS/Zoho settings and representative received-message headers was not available in this task. This item is prepared but not verified or enforced. Do not label it finished merely because the website builds successfully.

Primary references: [Zoho DMARC policy and alignment](https://www.zoho.com/mail/help/adminconsole/dmarc-policy.html), [Zoho DMARC reports](https://www.zoho.com/mail/help/adminconsole/dmarc-reports.html), [Resend DMARC report interpretation](https://resend.com/blog/how-to-read-a-dmarc-report).
