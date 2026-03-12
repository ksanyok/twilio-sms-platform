# Lovable Prompt — A2P 10DLC Compliance Fix (v3)

> Финальный промпт для Lovable. Исправляет ВСЕ проблемы: отсутствующие страницы, формы opt-in, домены, email-адреса.

---

## ПРОМПТ ДЛЯ LOVABLE (скопируй и вставь):

---

I need to make critical changes to fix our Twilio A2P 10DLC SMS campaign that was **rejected** by carriers due to "provided Opt-in information". The following changes are required across the site. Please implement ALL of them carefully.

**IMPORTANT — Two global rules to apply EVERYWHERE on the site:**

**Rule 1 — Domain consistency:** Our website is live at **sclcapital.io**. Anywhere on the site where it currently says just "securecreditlines.com" as a website URL (for example in Terms §1 "website located at securecreditlines.com", or in Privacy §1 "through our website at securecreditlines.com", or in SMS Compliance "Website: securecreditlines.com"), update it to **"sclcapital.io (securecreditlines.com)"**. The actual live domain `sclcapital.io` must always appear FIRST. Apply across ALL pages: `/terms`, `/privacy`, `/sms-terms`, `/sms-compliance`, and the new `/sms-consent`.

**Rule 2 — Email consistency:** Everywhere on the site where `info@securecreditlines.com` appears as the only contact email, add `info@sclcapital.io` as an alternative so that the email matches the live domain. The format should be: **"info@sclcapital.io (or info@securecreditlines.com)"**. This applies to:

- Footer CONTACT section on ALL pages
- `/terms` Section 11 (Contact)
- `/privacy` Section 10 (Contact Us)
- `/sms-terms` Section 6 (Help) and Section 9 (Contact Us)
- `/sms-compliance` Section 1 (Program Description table), Section 6 (Help), and Section 10 (Contact)
- The new `/sms-consent` page
- The HELP auto-reply text shown on `/sms-terms` §6 and `/sms-compliance` §6: change `"email info@securecreditlines.com"` to `"email info@sclcapital.io or info@securecreditlines.com"`

---

### 1. CREATE NEW PAGE: `/sms-consent` — SMS Consent & Opt-In Disclosure

Create a new page at route `/sms-consent`. This is the **dedicated opt-in disclosure page** that Twilio reviewers will verify. It MUST contain **BOTH** an informational disclosure section AND a working opt-in form with a phone number field and a checkbox. This is mandatory for Twilio compliance.

**Page header:**

- Breadcrumb label at top: "LEGAL" (same style as `/sms-terms` and `/sms-compliance`)
- Title: "SMS Consent & Opt-In"
- Subtitle: "Secure Credit Lines — SMS Program Enrollment"

**Section 1: "About Our SMS Program"**

> By submitting the form below and checking the SMS consent checkbox, you agree to receive text messages from **Secure Credit Lines** (operated by **BBC Consulting LLC**) at the mobile phone number you provide. Messages may include:
>
> - Funding inquiry confirmations
> - Application status updates
> - Advisor follow-up notifications
> - Service-related communications
>
> **Message Frequency:** Message frequency varies. Typically no more than 5 messages per week.
>
> **Message & Data Rates:** Standard message and data rates may apply. Contact your wireless carrier for details.
>
> **Opt-Out:** You can opt out at any time by replying **STOP** to any message. You will receive one confirmation and no further messages will be sent.
>
> **Help:** Reply **HELP** for assistance, or contact us at info@sclcapital.io (or info@securecreditlines.com) or call (720) 643-2649.
>
> **Consent is not required** to purchase any goods or services. Your mobile number and consent data will **never be sold, rented, or shared with third parties** for marketing purposes.

**Section 2: "Opt In to SMS Updates" — WORKING FORM (CRITICAL)**

This MUST be an actual working form with these fields:

1. **Full Name** — text input, required
2. **Phone Number** — tel input, required, placeholder "(555) 555-5555"
3. **SMS Consent Checkbox** — checkbox, **unchecked by default**. Label text:

> ☐ I agree to receive SMS text messages from Secure Credit Lines (BBC Consulting LLC) at the phone number provided above. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out. Reply HELP for help. Consent is not required to purchase any services. [SMS Terms](/sms-terms) · [Privacy Policy](/privacy)

4. **Submit button** — text: "Subscribe to SMS Updates"

**Form requirements:**

- Submit button is **disabled** (grayed out) until BOTH the phone number is filled AND the checkbox is checked
- On successful submit, show a success toast: "Thank you! You have been subscribed to SMS updates from Secure Credit Lines."
- The links to `/sms-terms` and `/privacy` inside the checkbox label must be clickable
- Checkbox label text should use smaller font (text-sm)
- The form should be styled to match the site design — use a card with subtle border or background similar to how the `/contact` form looks

**Section 3: "How to Opt In via Funding Inquiry"**

> You can also opt in to SMS when submitting a funding inquiry:
>
> 1. Visit our [Check Funding Options](/contact) page
> 2. Fill out the funding inquiry form
> 3. Check the SMS consent checkbox (unchecked by default)
> 4. Submit the form — your consent is recorded with timestamp and IP address

**Section 4: "Related Policies"**

- [SMS Terms & Conditions](/sms-terms)
- [SMS Compliance & Messaging Policy](/sms-compliance)
- [Privacy Policy](/privacy)
- [Terms & Conditions](/terms)

**Footer:** Same footer as all other pages.

---

### 2. UPDATE THE CONTACT FORM (`/contact`) — Add SMS Consent Checkbox

On the `/contact` page funding inquiry form, add an **explicit SMS consent checkbox** with proper disclosure text. This is required by Twilio for opt-in compliance.

**Implementation:**

- Add the checkbox **after the Phone Number field** in Step 1 of the form
- The checkbox must be **unchecked by default** (never pre-checked)
- The checkbox is **optional** — NOT required to submit the form (the user can submit a funding inquiry without opting in to SMS)

**Checkbox label text (exactly):**

> ☐ I agree to receive SMS text messages from Secure Credit Lines (BBC Consulting LLC) at the phone number provided above. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out. Reply HELP for help. Not required to purchase services. [SMS Terms](/sms-terms) · [Privacy Policy](/privacy)

**Requirements:**

- Links to `/sms-terms` and `/privacy` inside the label must be clickable
- Checkbox label text: smaller font (text-sm or text-xs)
- Visually distinct standard checkbox input

---

### 3. ADD REDIRECT: `/privacy-policy` → `/privacy`

Add a client-side redirect so `/privacy-policy` automatically redirects to `/privacy`.

---

### 4. ADD REDIRECT: `/terms-conditions` → `/terms`

Add a client-side redirect so `/terms-conditions` automatically redirects to `/terms`.

---

### 5. FIX DOMAIN REFERENCES — Specific locations

Apply Rule 1 (domain consistency) to these specific places. Replace `securecreditlines.com` with `sclcapital.io (securecreditlines.com)`:

| Page              | Section                      | Current text                                          | New text                                                       |
| ----------------- | ---------------------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| `/terms`          | §1 Agreement to Terms        | "website located at securecreditlines.com"            | "website located at sclcapital.io (securecreditlines.com)"     |
| `/privacy`        | §1 Introduction              | "through our website at securecreditlines.com"        | "through our website at sclcapital.io (securecreditlines.com)" |
| `/sms-compliance` | §1 Program Description table | "Website: securecreditlines.com"                      | "Website: sclcapital.io (securecreditlines.com)"               |
| `/sms-compliance` | §9 10DLC Compliance table    | "Website: securecreditlines.com"                      | "Website: sclcapital.io (securecreditlines.com)"               |
| `/sms-terms`      | §8 10DLC Registration        | if "securecreditlines.com" appears, add sclcapital.io |

---

### 6. FIX EMAIL REFERENCES — Specific locations

Apply Rule 2 (email consistency). Wherever `info@securecreditlines.com` appears as the sole email, change to `info@sclcapital.io` first, with `info@securecreditlines.com` as alternative:

| Page                   | Section                              | Change                                                     |
| ---------------------- | ------------------------------------ | ---------------------------------------------------------- |
| **Footer** (ALL pages) | CONTACT section                      | `info@sclcapital.io` (or `info@securecreditlines.com`)     |
| `/terms`               | §11 Contact                          | `info@sclcapital.io` (or `info@securecreditlines.com`)     |
| `/privacy`             | §10 Contact Us                       | `info@sclcapital.io` (or `info@securecreditlines.com`)     |
| `/sms-terms`           | §6 Help — shown HELP reply text      | `"email info@sclcapital.io or info@securecreditlines.com"` |
| `/sms-terms`           | §6 Help — Email line below           | `info@sclcapital.io` (or `info@securecreditlines.com`)     |
| `/sms-terms`           | §9 Contact Us                        | `info@sclcapital.io` (or `info@securecreditlines.com`)     |
| `/sms-compliance`      | §1 Program Description table — Email | `info@sclcapital.io` (or `info@securecreditlines.com`)     |
| `/sms-compliance`      | §6 Help — shown HELP reply text      | `"email info@sclcapital.io or info@securecreditlines.com"` |
| `/sms-compliance`      | §6 Help — Email line below           | `info@sclcapital.io` (or `info@securecreditlines.com`)     |
| `/sms-compliance`      | §10 Contact                          | `info@sclcapital.io` (or `info@securecreditlines.com`)     |

---

### 7. ADD SMS CONSENT SECTION TO TERMS & CONDITIONS (`/terms`)

Add a new **Section 9. SMS Communications** between current §8 (Privacy) and §9 (Changes to Terms):

> By opting in to the Secure Credit Lines SMS Program through our website, you consent to receive text messages regarding your funding inquiry, application status, and related service communications. Message frequency varies. Message and data rates may apply. You may opt out at any time by replying STOP. Reply HELP for assistance. Consent to receive SMS is not a condition of any purchase or service. For full SMS terms, see our [SMS Terms](/sms-terms) page. For SMS data handling, see our [Privacy Policy](/privacy).

Renumber remaining sections:

- Old §9 → §10 (Changes to Terms)
- Old §10 → §11 (Governing Law)
- Old §11 → §12 (Contact)

---

### 8. UPDATE FOOTER LEGAL LINKS — Add "SMS Consent"

In the footer **LEGAL** section on ALL pages, add "SMS Consent" link. New order:

1. SMS Terms → `/sms-terms`
2. SMS Compliance → `/sms-compliance`
3. **SMS Consent → `/sms-consent`** ← NEW
4. Privacy Policy → `/privacy`
5. Terms & Conditions → `/terms`

---

### Summary of ALL changes:

1. ✅ Create `/sms-consent` page — disclosure text + **working form** (name, phone, checkbox, submit button)
2. ✅ Add SMS consent checkbox to `/contact` form after phone field
3. ✅ Redirect `/privacy-policy` → `/privacy`
4. ✅ Redirect `/terms-conditions` → `/terms`
5. ✅ Fix domain: `securecreditlines.com` → `sclcapital.io (securecreditlines.com)` on all legal pages
6. ✅ Fix email: add `info@sclcapital.io` alongside `info@securecreditlines.com` everywhere
7. ✅ Add SMS section (§9) to `/terms`
8. ✅ Add "SMS Consent" link to footer LEGAL section

---

# ПОСЛЕ LOVABLE — Заполнение Twilio A2P Campaign

## ВАЖНО: НЕ нажимай Update пока `/sms-consent` не работает! Twilio ревьюер зайдёт по ссылке.

---

## ПОЛЕ 1: Campaign description

Скопируй и вставь:

```
BBC Consulting LLC (dba Secure Credit Lines) uses this campaign to communicate with business owners who have requested information about commercial financing options. Leads opt in through our website at https://sclcapital.io/sms-consent by submitting their phone number and checking a consent box. Messages include application follow-ups, funding updates, document reminders, and service notifications. Recipients may reply STOP to opt out at any time.
```

---

## ПОЛЕ 2: Sample message #1

```
Secure Credit Lines: Hi {{first_name}}, following up on your request for business financing options. Let us know if you'd like to review available programs. Reply STOP to opt out.
```

## ПОЛЕ 3: Sample message #2

```
Secure Credit Lines: Your financing application is pending additional details. Reply here if you need assistance completing your request. Reply STOP to opt out.
```

## ПОЛЕ 4: Sample message #3

```
Secure Credit Lines: Hi {{first_name}}, your funding application status has been updated. Please check your email or contact your advisor for details. Reply STOP to opt out.
```

> **ВНИМАНИЕ:** НЕ пиши "new funding programs" или "may match your profile" — это звучит как реклама. Campaign type = Mixed/Customer Care, поэтому все сообщения должны быть транзакционными (о заявке клиента, статусе, документах).

---

## ПОЛЕ 5: Message contents (чекбоксы)

- [x] Messages will include embedded links
- [ ] Messages will include phone numbers
- [x] Messages include content related to direct lending or other loan arrangement
- [ ] Messages include age-gated content

---

## ПОЛЕ 6: How do end-users consent to receive messages? (40-2048 characters)

Скопируй и вставь:

```
End users provide consent by visiting https://sclcapital.io/sms-consent and submitting the opt-in form with their name and phone number. The form includes a clearly labeled, unchecked-by-default checkbox stating: "I agree to receive SMS text messages from Secure Credit Lines (BBC Consulting LLC) at the phone number provided above. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out. Reply HELP for help. Consent is not required to purchase any services." The submit button is disabled until the checkbox is checked and the phone number is provided. Users may also opt in by submitting a funding inquiry at https://sclcapital.io/contact, which includes the same SMS consent checkbox after the phone number field. Consent is recorded with timestamp and IP address. Full SMS terms: https://sclcapital.io/sms-terms. SMS compliance policy: https://sclcapital.io/sms-compliance. Recipients may reply STOP at any time to opt out.
```

> **ВНИМАНИЕ:** Убрал "referral partners or prior business relationships" — Twilio хочет видеть ТОЛЬКО явный web-based consent. Любые расплывчатые формулировки = отклонение.

---

## ПОЛЕ 7: Privacy Policy URL

```
https://sclcapital.io/privacy
```

---

## ПОЛЕ 8: Terms and Conditions URL

```
https://sclcapital.io/terms
```

---

## ПОЛЕ 9: Чекбокс "I agree the above information is correct"

- [x] Отметить только когда ВСЕ поля заполнены правильно и `/sms-consent` работает

---

## Нажать "Update" ТОЛЬКО когда:

1. `/sms-consent` загружается (не 404) и содержит форму с телефоном и чекбоксом
2. `/contact` содержит SMS чекбокс
3. Все URL выше открываются без ошибок
4. Lovable деплой завершён

---

# КРАТКАЯ СВОДКА ИЗМЕНЕНИЙ В TWILIO

| Поле                 | Было (НЕПРАВИЛЬНО)                                  | Стало (ПРАВИЛЬНО)                                       |
| -------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| Campaign description | Ок, но "SCL Capital"                                | Убрали "SCL Capital", оставили "Secure Credit Lines"    |
| Sample #1            | "BBC Consulting LLC: Hi..."                         | "Secure Credit Lines: Hi..."                            |
| Sample #2            | "BBC Consulting LLC: Your..."                       | "Secure Credit Lines: Your..."                          |
| Sample #3            | "BBC Consulting LLC: ...new funding programs..."    | "Secure Credit Lines: ...application status updated..." |
| Consent description  | "referral partners or prior business relationships" | Только web-based consent через формы                    |
| Privacy Policy URL   | `https://example.com/privacy-policy`                | `https://sclcapital.io/privacy`                         |
| Terms URL            | `https://example.com/terms-and-conditions`          | `https://sclcapital.io/terms`                           |

---

# ЧЕКЛИСТ ПЕРЕД ПОВТОРНОЙ ПОДАЧЕЙ

## Страницы:

- [ ] `/sms-consent` — загружается, содержит disclosure + **рабочую форму** (имя, телефон, чекбокс, кнопка)
- [ ] `/sms-consent` — кнопка submit disabled пока чекбокс не отмечен и телефон не введён
- [ ] `/contact` — форма содержит чекбокс SMS согласия после поля Phone Number
- [ ] `/contact` — чекбокс unchecked по умолчанию, необязателен для отправки формы
- [ ] `/privacy` — §4 SMS Program на месте, домен sclcapital.io, оба email
- [ ] `/terms` — новая §9 SMS Communications добавлена, домен sclcapital.io, оба email
- [ ] `/sms-terms` — домен обновлён, оба email в §6 и §9
- [ ] `/sms-compliance` — домен обновлён в §1 и §9, оба email в §1, §6, §10

## Редиректы:

- [ ] `/privacy-policy` → редирект на `/privacy`
- [ ] `/terms-conditions` → редирект на `/terms`

## Домены и email:

- [ ] Везде `securecreditlines.com` дополнен `sclcapital.io` (sclcapital.io идёт первым)
- [ ] Везде `info@securecreditlines.com` дополнен `info@sclcapital.io` (sclcapital.io идёт первым)
- [ ] Футер на ВСЕХ страницах: email обновлён на `info@sclcapital.io`
- [ ] HELP auto-reply текст на `/sms-terms` и `/sms-compliance` содержит оба email

## Навигация:

- [ ] Футер LEGAL: ссылка "SMS Consent" → `/sms-consent` добавлена
- [ ] Все ссылки в футере работают

## Twilio Console:

- [ ] Campaign description — обновлён (без "SCL Capital")
- [ ] Sample messages — все 3 начинаются с "Secure Credit Lines:" (не "BBC Consulting LLC:")
- [ ] Sample #3 — транзакционный (про статус заявки), не рекламный
- [ ] Consent description — только web-based consent, без "referral partners"
- [ ] Privacy Policy URL = `https://sclcapital.io/privacy`
- [ ] Terms URL = `https://sclcapital.io/terms`
- [ ] Все 6 URL в consent description и в полях — рабочие (не 404)
