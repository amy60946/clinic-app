# Cancel-moment save offers and win-back: benchmark and recommended design

Scope: Moyo Ebeveyn (parent app) and Moyo Mercek (therapist app). Both sell only through Apple App Store auto-renewable subscriptions, managed with RevenueCat `react-native-purchases` 10.16. Research date: 17 November 2026. Numbers in square brackets point to the source list at the end.

How to read the confidence labels used below:

- **Primary** = Apple documentation, company help centre, regulator page, or the SDK code installed in the repo.
- **Vendor** = a company that sells retention tooling reporting its own numbers.
- **Third-party** = consumer cancellation guides, blogs, law-firm summaries. Useful, but not confirmed by the company or regulator itself.

Research limits: in this session only `developer.apple.com` could be opened directly. RevenueCat docs, help centres and Turkish legal texts were read through search-result summaries, not the full pages. RevenueCat SDK method names were confirmed in the installed package (`clinic-app/node_modules/react-native-purchases`, version 10.16.0) [34].

Project facts taken from the repos (they change the design):

- Neither app uses an App Store free trial (introductory offer). The trial is server-side and needs no card (parent 7 days, therapist 14 days). So everyone who reaches Apple's cancel page is a paying subscriber [77].
- Parent products: group "Moyo Premium", `parentapp.premium.monthly`, `parentapp.premium.yearly`; entitlement `premium`. After expiry the parent falls back to a limited free plan [77].
- Therapist products: one group "Moyo Mercek Üyelik", `com.clinicapp.uzman.solo.{monthly,yearly}` (Bireysel) and `com.clinicapp.uzman.clinic.{monthly,yearly}` (Klinik), Klinik ranked above Bireysel; entitlement `clinic`. After expiry the panel is replaced by the paywall [77].
- RevenueCat events already arrive at the Supabase Edge Function `billing-webhook` [77].
- Internal marketing rules: every "free"/discount mention carries price, period and auto-renewal; promotional e-mail, SMS and push go only to people with separate consent recorded in İYS [77].

---

## 1. What is technically possible on iOS + RevenueCat

The cancel button itself belongs to Apple. An app cannot cancel a subscription, cannot block the cancel, and cannot add steps inside Apple's sheet. What an app can do is act before, on, and after Apple's page.

| # | Mechanism | What it does | Requirements and limits | Fit for us |
|---|---|---|---|---|
| 1 | **In-app pre-cancel screen**, then `Purchases.showManageSubscriptions()` | Our own screen (reason question, alternative, offer) shown when the user taps "Aboneliği yönet"; then Apple's manage-subscriptions sheet opens inside the app. Apple: "By providing a dedicated place in your app to manage subscriptions, you can also display other options to complement the system-provided management UI" and "always make it easy for people to access the system-provided management UI where they can cancel if they wish" [12]. | Apple's sheet is iOS 15+ in StoreKit [13]; the RevenueCat method exists in 10.16.0 [34]. Users can skip our screen entirely by cancelling in Settings › Apple Account › Subscriptions, so this cannot be the only line. | **Core**, both apps. |
| 2 | **Apple Retention Messages (App Store Connect)** — generally available since 4 Nov 2026 [1] | Our message appears on Apple's own "Confirm Cancellation" page, after the customer taps Cancel Subscription, in a section "From the developer", next to Apple's Cancel Subscription / Keep Subscription buttons [3]. Three variants: text only, text + image, text + **retention offer** (a new offer type; Apple picks the best eligible one) [2][5]. | Up to 10 messages per app; one active message per subscription; up to 10 retention offers per subscription billing-plan type. Offer types: pay as you go, pay up front, free. Eligibility rules: "Paid Subscription Duration" and "Wait Between Offers". Offer countries selectable. **Message text may not mention offers, discounts or prices**; no coercive or unverifiable claims; goes through App Review; needs localisations for every storefront where the subscription is sold [2]. Visible on iOS 15.1+ [3]. Redemptions show `offerType` 5 in the transaction [5]. | **Core**, both apps. It is the only way to reach people who cancel from Settings without opening the app. No app code needed. |
| 3 | **Retention Messaging API (real-time)** | Apple's server calls our endpoint when a subscriber opens the subscription details page; we answer which message to show. Adds two message types not available in App Store Connect: **switch-plan** (suggest another product in the same group) and **promotional-offer** chosen per subscriber [3][4][5]. | Access by request form [16][1]. Needs a server endpoint that passes Apple's performance test [3][5]. RevenueCat says it can host the endpoint and manage messages under Lifecycle › Retention, and that responses must come within 700 ms (RevenueCat's statement) [22][25]. Falls back to the App Store Connect message, then to a default message [5]. | **Later.** Valuable for Mercek ("switch to Bireysel" on Apple's page). Start with #2. |
| 4 | **Detecting "auto-renew turned off"** | RevenueCat webhook `CANCELLATION` (with `cancel_reason`, e.g. `UNSUBSCRIBE`, `BILLING_ERROR`), `UNCANCELLATION` when it is turned back on, `EXPIRATION` when access ends [21]. In the app: `entitlement.willRenew === false`, `unsubscribeDetectedAt`, `expirationDate` [34]. Apple's own signal is the server notification `DID_CHANGE_RENEWAL_STATUS` [9]. | RevenueCat needs App Store Server Notifications pointed at it for timely events. The full list of `cancel_reason` values was seen only in summaries; verify on the RevenueCat page [21]. | **Core.** Drives the post-cancel sequence. |
| 5 | **Promotional offers** | Discount or free period for **existing or previously subscribed** customers; the developer decides who is eligible [8][9]. Apple lists the use cases itself: a discounted month for someone not engaging, an offer for people who cancelled [12]. | Up to 10 active per subscription [8]. Needs an In-App Purchase key; each purchase needs a server signature (RevenueCat does the signing once the key is uploaded) [17]. Cannot be limited to a country: "apply to all storefronts" [8]. Must be accepted inside the app's UI [9]. One promotional offer active at a time; for the same product "the offer period starts at the next billing event" [9]. React Native: `Purchases.getPromotionalOffer(product, discount)` then `Purchases.purchaseDiscountedPackage(pkg, offer)` [34][17]. | **Core** for the in-app save offer and for the first 30 days after expiry. |
| 6 | **Win-back offers** (iOS 18+ for the in-app sheet) | Offers only for **lapsed** subscribers (expired and auto-renew off) [7]. Apple shows them by itself: on the Manage Subscriptions page (iOS 14.3+), in an automatic in-app sheet (iOS 18+), on the App Store if promoted, and through a redemption link `https://apps.apple.com/win-back/<id>` [6][7]. | Per product, not per group. Eligibility: minimum paid duration (1–24 months or 3–5 years), **time since last subscribed: minimum 1 month**, maximum 24; optional wait between offers 2–24 months. Max 5 running per storefront per subscription. Price cannot be changed after creation. Earliest start is the next day; minimum run 3 days [6]. React Native: `getEligibleWinBackOffersForPackage`, `purchasePackageWithWinBackOffer` (iOS 18+, StoreKit 2) [34][17]. | **From day +30.** Because of the 1-month minimum, days 0–30 after expiry must use promotional offers or offer codes. |
| 7 | **Offer codes** | One-time or custom codes (e.g. a named code) redeemable by URL, in the App Store, or in-app. Eligibility selectable: new, existing, expired subscribers [10]. Apple's own suggestions: "Display a save offer in your app to a subscriber who has turned off auto-renew but their subscription hasn't expired yet" and compensation after a support issue [12]. | 1 million redemptions per app per quarter; one-time codes expire within 6 months; cannot be edited after creation; up to 10 active offers per subscription [10]. React Native: `Purchases.presentCodeRedemptionSheet()` [34]. | **Support and e-mail channel**, especially Mercek "talk to us". |
| 8 | **Billing Grace Period + billing retry** (involuntary churn) | Subscriber keeps access for 3, 16 or 28 days while Apple retries the charge; if recovered, no gap in paid days or revenue. Apple keeps retrying for 60 days [11][12]. From iOS 16.4 Apple shows its own "update payment method" sheet in the app at launch [12]. RevenueCat keeps the entitlement active in the grace period, sets `billingIssueDetectedAt`, and sends `BILLING_ISSUE` with the grace deadline [26][34]. | Switch on in App Store Connect › Subscriptions › Billing Grace Period (duration, "All Renewals" or "Only Paid to Paid", sandbox/production) [11]. | **Must-have, zero code to switch on.** |
| 9 | **Pause** | — | **Not available for App Store subscriptions.** Apple's manage sheet offers only view, upgrade, downgrade, cancel [13]; RevenueCat's pause field is "Only set for Google Play subscriptions" [34]; YouTube's help says pause is not offered to members billed through Apple [43]. | Replace with a **free-period promotional offer** ("1 ay bizden") or a downgrade. |
| 10 | **Upgrade / downgrade / crossgrade inside a subscription group** | Downgrade: continues until next renewal, then renews at the lower level. Crossgrade with different duration: takes effect at next renewal. Upgrade: immediate with prorated refund [12]. Users can do this in Apple's sheet or by buying the other product in the app. | Depends on the ranking set in App Store Connect [12]. Server must apply the new seat limit when Klinik becomes Bireysel. | **Core for Mercek** (Klinik→Bireysel, yearly↔monthly); parent yearly↔monthly. |
| 11 | **Monthly subscription with 12-month commitment** | New billing plan: yearly commitment paid monthly [15][12]. | Available worldwide except the US and Singapore; needs recent iOS (26.4/26.5 per press coverage) [15]. Billing Grace Period does not apply to it [11]. | **Not now.** A commitment contract raises Turkish consumer-law questions (needs lawyer). |
| 12 | **RevenueCat Customer Center** | Ready-made subscription-management screen: cancel path with a feedback survey (defaults "Too expensive", "Don't use the app", "Bought by mistake"), a promotional offer tied to an answer, refund request and plan change (iOS only), restore [19][20]. | React Native: package `react-native-purchases-ui` 8.7.0 or higher, `RevenueCatUI.presentCustomerCenter()` [18]; iOS 15+ [28]; needs a development build (in Expo Go the UI package has no effect) [31]. Generally available since Dec 2024 [28]. Offers must exist in App Store Connect and be assigned in the dashboard [20]. Not confirmed: Turkish localisation, plan/pricing, full list of React Native callbacks. | **Optional shortcut.** See 4.1 for why a small custom screen is recommended. |
| 13 | **RevenueCat Paywalls, Targeting, Experiments** | Paywalls can carry offers; "exit offers" when a paywall is dismissed (Dec 2025); experiments for retention messages; save-rate charts [30][32]. | RevenueCat itself flags App Review caution for exit offers on iOS (seen in a summary only) [30]. | **Later**, for the lapsed-user paywall and for A/B tests. |
| 14 | **Refund request sheet** | `Purchases.beginRefundRequestForActiveEntitlement()` opens Apple's refund request (iOS 15+) [34]. | Apple decides the refund. | Optional, for "bought by mistake". |
| 15 | **Renewal date extension** | App Store Server API: move a renewal date up to 90 days, twice per calendar year, for service problems [12]. | Server call to Apple; not checked whether RevenueCat exposes it. | Optional compensation tool for Mercek support. |

App Review rules that matter here:

- No guideline regulates save offers directly. 3.1.2 covers subscriptions in general [14].
- 5.6: apps must not "trick them into making unwanted purchases ... or engage in any other manipulative practices"; excessive refund requests and bad reviews count against the developer (5.6.4) [14].
- 4.5.4: push notifications may not be used for promotions unless the customer explicitly opted in inside the app and can opt out [14].
- Retention message text is reviewed: factual loss statements are fine ("You'll lose access to downloaded content..."), coercive or unverifiable claims and price mentions are rejected [2].

---

## 2. Benchmark

Important finding first: for **Apple-billed** subscriptions the companies below simply send the user to Apple (Netflix, Headspace and Calm say so in their help pages [41][46][47]; guides report the same for Spotify, Audible and Canva). Their rich save flows live on the **web**. So the web flows show *what* to offer; the iOS mechanics in section 1 decide *how*.

| Company | Entry point | Steps | Offers | To whom | Notable guardrail | Source / confidence |
|---|---|---|---|---|---|---|
| **Duolingo (Super)** | In-app: Super › settings › manage subscription › cancel; then confirmation in App Store / Google Play | Third-party walkthrough: a "Going so soon?" screen with a reminder option and a large "keep" button, a reason prompt, a final keep/cancel dialog. Not confirmed by Duolingo. | No cancel-moment discount found in any source. Reactivate button while the paid period runs (third-party). Seasonal New Year discount on Super (Duolingo's own engineering blog). Promo codes do not work on active subscriptions. "Streak Revival" (June 2026) let lapsed learners restore a long streak for free. | As far as the sources show, discounts go to people **without** an active subscription; active subscribers get habit mechanics (streak, reminders), not price cuts. | Access continues to the end of the paid period; progress is kept. | Primary [35][37][38]; third-party [36][39][40]. **No primary teardown of the cancel screens was found.** |
| **Netflix** | Account › Cancel Membership (web) | Cancel page, then "Finish Cancellation". | **Pause for one month** offered on the cancel page (not on every plan or payment method; total 3 months). No discount. "Restart Membership" any time; profiles kept. | All eligible plans. | Apple-billed members must cancel through Apple. | Primary [41] (some help pages are old). |
| **Spotify** | Account › Manage your plan › Cancel subscription (web) | Third-party reports differ: "Continue to cancel", one or two save screens, optional reason list. | No confirmed cancel-moment discount. Win-back campaigns for returning subscribers (2021–2022: three months for USD 9.99), eligibility by a fixed cancel-before date. | Former Premium subscribers who cancelled before a cut-off date. | Apple-billed: cancel through Apple. | Primary [42] for path and win-back campaigns; flow details third-party. |
| **YouTube Premium** | Paid memberships › Manage › Deactivate | "Pause instead" or "Continue to cancel". | **Pause** (third-party: 1–6 months). | Monthly members billed by Google. | Not for annual plans, not for Apple-billed members. | Primary [43]; duration third-party. |
| **Audible** | Account › Cancel membership (web) | Official "Before you cancel" page; third-party: three or four screens, offer depends on the stated reason. | **Pause** up to 90 days once per 12 months (regional help pages); discounts reported by third parties only. | Web-billed members. | Cancel link not shown on web for Apple/Google-billed members. | Primary [44]; offers third-party. |
| **The New York Times** | Account page; chat; phone | Online self-serve for digital plans (third-party). | Retention discount commonly reported (third-party). | Digital subscribers. | Cautionary history: "click to subscribe, call to cancel" was named illegal by the FTC in 2021; class action in California over cancellation difficulty. | Third-party [45]. |
| **Headspace** | Web: manage page, "Cancel membership"; Apple: iOS Settings | — | None documented officially. | — | Headspace states it cannot cancel or refund Apple purchases. | Primary [46]; a vendor teardown exists but was not readable [57]. |
| **Calm** | Web account; Apple/Google: in the store | — | Help centre: promotions cannot be redeemed until the current subscription expires or is cancelled. One anecdotal report of a 40% coupon. | — | — | Primary [47]; anecdote unverified. |
| **Peloton** | Membership page: "Pause or Cancel" | — | **Pause** 1–3 months for the hardware membership; app-only members can only cancel. | All-Access members. | — | Third-party only [48]. |
| **Strava** | Web settings | Save screen showing the member's own stats and features with Keep / Cancel; reason survey. | No discount reported; sources disagree on pause. | — | — | Third-party [49]. |
| **Blinkist** | Web/app | Survey plus two save screens. | Discount in the cancel flow (30–40% claimed by one guide). | — | — | Third-party, single source [50]. |
| **Canva** | Settings › Billing › Cancel plan › Continue cancellation | Option to **pause for three months** instead; resumes automatically with an e-mail reminder. | Pause. | Monthly; annual only when under two months remain. | A guide says pause is not offered for App Store subscriptions (third-party). | Primary [53] for the pause itself. |
| **Notion** | Settings › Billing › Change plan | Feedback question, then Downgrade; effective at end of billing cycle. | A small discount reported by one third-party guide. | Workspace owners. | Change can be reversed before it takes effect. | Primary [54]; discount third-party. |
| **Zoom** | Web billing | Multiple clicks; survey may show discount or other plan. | Discounts appear as a banner in the portal and cannot be re-issued by staff afterwards. | Account owners. | — | Zoom community staff [55]; rest third-party. |
| **SimplePractice** (therapist software) | Settings › Practice › Plan info › Cancel account | Reason(s) + comments, data export button, typed confirmation phrase. | No self-serve discount. Pausing or reducing the plan goes through a **help request to Customer Success**. | Account owner only. | Strong export-first messaging; account deletion is final. | Primary [56]. |
| **Adobe** (cautionary) | Web | — | — | — | FTC/DOJ complaint (June 2024): early-termination fee buried at sign-up; cancellation with "unnecessary steps, delays, unsolicited offers, and warnings". Proposed settlement March 2026: USD 75M penalty + USD 75M free services + new disclosure and cancellation duties; court approval pending when reported. | News [51]. |
| **Amazon Prime** (cautionary) | Web | — | — | — | USD 2.5B FTC settlement (Sept 2025); must offer cancellation by the same method as sign-up, with a clear decline button. | News [52]. |

Patterns that repeat:

1. **Ask the reason, then answer that reason.** Pause for "not using", cheaper plan for "too expensive", support for "problem", nothing for "no longer need it".
2. **Pause beats discount where pause exists** (Netflix, YouTube, Canva, Audible, Peloton). On iOS it does not exist, so a free period or a downgrade has to play that role.
3. **The biggest brands (Netflix, Duolingo) do not discount at the cancel moment.** They make leaving easy, keep the account intact and work on win-back.
4. **B2B adds a human route** (SimplePractice: Customer Success; Zoom: account banner).
5. **The cautionary cases** were punished for hidden fees, extra steps and repeated unsolicited offers — not for making one clear offer.

---

## 3. What the data says works

All numbers below belong to the named source and were not independently verified.

| Source | Their number | Note |
|---|---|---|
| Apple (WWDC26, session 309) | Subscriptions that adopted Retention Messaging saw an average save-rate increase of **+1.4 points (82%)**; promotional-offer messages reached **+5.5 points (223%)**. Apple adds: "we have observed varying results across developers" [5]. | Apple defines save rate as the share who keep the subscription after reaching the cancel-confirmation page. |
| RevenueCat benchmark of Apple retention messages (309 apps) | Median "save rate" **16.7%**; offer acceptance **0.68%** for promotional offers and **0.52%** for plan switches (another RevenueCat post says about 1.1% and 0.6%); no clear effect on cancellation rates in early data [24][23]. | Their save rate = customer did not cancel within 24 hours of seeing the message, so it includes people who would have stayed anyway. |
| RevenueCat State of Subscription Apps 2026 | 95% of annual subscribers who cancel do not come back; month 1 holds 35% of annual cancellations [29]. | Read via press summaries. |
| Churnkey State of Retention 2025 (3M+ cancel sessions) | Of accepted offers: **discount 53.9%, pause 19.2%, plan change 6.7%**, other 20.2%. Top reasons: budget 33%, low usage 31% [58][59]. | Vendor. Web SaaS and consumer subscriptions, not App Store. |
| Churnkey (blog) | Customers who accept a discount stay 5.1 months longer on average; 11% are still subscribed a year later; a deeper discount does not necessarily raise acceptance [59]. | Vendor; no method published. |
| Churnkey platform average | 34% of cancel attempts saved (quoted by Userpilot) [63]. | Vendor. |
| Recurly State of Subscriptions | "3 out of 4" subscribers who pause return; 34% of former subscribers say a discount could have kept them; 55% of consumers want a pause option, 37% have one; former subscribers make up nearly 1 in 4 new sign-ups [60]. | Vendor. |
| ProsperStack case studies | Star Tribune: 18.5% online save rate, 14.6% offer acceptance; Hootsuite: 9.7% retained by the flow [61]. | Vendor. |
| Paddle Retain | 25–30% "salvage rate" in docs; 8% average churn reduction in a blog post [62]. | Vendor; figures differ by page. |

What to take from it:

- **Match the offer to the reason.** The two dominant reasons are price and low usage, roughly a third each [59].
- **Discounts are accepted most, but many re-cancel when the discount ends** (11% still there after a year, by the vendor's own number) [59]. Measure re-churn, not acceptance.
- **Web cancel flows report 10–35% saves; Apple's page reports low single-digit point gains** [5][24]. On iOS, expect a modest effect at the cancel moment and put equal effort into the period after auto-renew is switched off and into win-back.
- **Annual cancellers rarely return** [29]. For yearly plans the work is before renewal (reminder, value summary), not after.

---

## 4. Recommended flow

### 4.1 Shared design

**Three places where we act**

1. **In the app, before Apple's sheet** — "Aboneliği yönet" opens our screen: plan summary, one reason question (skippable), one matching alternative, and an always-visible "Aboneliği iptal et" that opens Apple's sheet.
2. **On Apple's Confirm Cancellation page** — a Retention Message configured in App Store Connect, with a retention offer for eligible subscribers. Catches people who cancel from Settings.
3. **After auto-renew is switched off** — confirmation card, optional one-question survey for those who skipped ours, reminder before expiry, then win-back.

**Custom screen or RevenueCat Customer Center?** Recommended: a small custom flow (two screens) built on the same RevenueCat offer calls. Reasons: several of our answers are not offers at all (shorten the routine, switch Klinik→Bireysel with a seat warning, "Bize yaz"); the eligibility caps live on our server; copy must be in our Turkish voice; our own usage log already exists. Customer Center remains a valid shortcut if development time is short; check Turkish localisation first (not confirmed).

**Guardrails (apply to both apps)**

- "Aboneliği iptal et" is on **every** screen of the flow, same size and contrast as the other secondary action, never greyed or hidden. With the survey skipped it is two taps from "Aboneliği yönet" to Apple's sheet.
- At most **one** offer screen per visit. "Hayır" goes straight to Apple's sheet. The same offer is never shown again in the same paid period.
- The reason question is optional ("Yanıtlamadan iptale git").
- No countdown timers, no invented scarcity, no mascot guilt, no "Are you sure you want to lose…" loops. Loss statements are factual and checked by the product team.
- Wherever a discount or free period is mentioned: the discounted price, how long it lasts, the price after, and that it renews automatically. Prefer real prices ("ayda {indirimli_fiyat}") over percentage claims.
- Offers are taken from the store at run time (`product.discounts`), never typed into the app.
- Push and e-mail that carry an offer go only to people with marketing consent; everyone else sees the offer inside the app only.
- A holdout group (for example 10%) sees the flow without offers, so the real effect can be measured.

**Who gets an offer**

| Situation | Rule |
|---|---|
| No completed paid renewal yet (first month, or first year of a yearly plan before 30 days) | No discount. Help, plan switch, or straight to cancel. |
| Monthly, at least one paid renewal, no save offer accepted in the last 6 months (parent) / 12 months (therapist) | Offer by reason (tables below). |
| Yearly, more than 30 days before renewal | No discount now. Offer a renewal reminder and the monthly plan. |
| Yearly, within 30 days of renewal | Renewal-price offer (pay up front, one year). |
| Reason is "no longer need it" or "bought by mistake" | No offer. |
| Billing problem (not a choice) | No offer; help to update the payment method. |
| Currently inside an offer period | No further offer. |

### 4.2 Moyo Ebeveyn

**Entry points:** Aile › Hesap › Üyelik › "Aboneliği yönet"; Apple Settings (covered by the Retention Message); the in-app card after auto-renew is switched off.

**Reason options and what each leads to**

| Reason (shown text) | What we show next | Offer (if eligible) |
|---|---|---|
| "Pahalı geldi" | Monthly: discount screen. Yearly: reminder + "Aylık plana geç". | Monthly: 2 months at a reduced price (promotional offer, pay as you go). Yearly near renewal: reduced renewal price. |
| "Yeterince kullanmıyoruz" | Three one-tap helps: "Rutini 3 adıma indir", "Hatırlatma saatini değiştir", "Ödülü yenile". | 1 free month (promotional offer, type Free) — our stand-in for pause. |
| "Çocuğum oyunu oynamak istemiyor" | Short tips (reward, new routine pack). | Same 1 free month. |
| "Bir sorun yaşadım" | "Destek ekibine yaz". | None automatically; support may send an offer code as compensation. |
| "Aradığım özellik yok" | Optional free-text box. | None. |
| "Artık ihtiyacımız kalmadı" | Thank-you and what stays on the free plan. | None. |
| "Yanlışlıkla satın aldım" | "Apple'dan iade iste" + reminder that cancelling is separate. | None. |
| "Başka bir neden" | Optional free-text box. | None. |

**Example copy (in-app voice "sen"; `{…}` are filled from the store or server)**

*E1 — Üyelik*
> **Üyeliğin**
> Moyo Premium · Aylık
> {fiyat}/ay · {tarih} tarihinde kendiliğinden yenilenir
> [Planı değiştir] [Satın alımları geri yükle] [Aboneliği iptal et]

*E2 — Reason*
> **Ayrılmadan önce bir soru**
> Nedenini söylersen Moyo'yu ona göre düzeltiriz. Yanıtlamak zorunda değilsin.
> (seçenekler)
> [Devam]  Yanıtlamadan iptale git

*E3a — "Pahalı geldi", monthly*
> **2 ay indirimli devam etmek ister misin?**
> İndirim {tarih} tarihindeki yenilemede başlar: 2 ay boyunca ayda {indirimli_fiyat}. Sonrasında ayda {normal_fiyat} olarak kendiliğinden yenilenir. İstediğin zaman iptal edebilirsin.
> [İndirimle devam et] [İstemiyorum, iptale git]

*E3b — "Pahalı geldi", yearly, renewal far away*
> **Aboneliğin {tarih} tarihine kadar ödenmiş**
> Şimdi iptal etsen de o tarihe kadar Premium açık kalır. İstersen yenilemeden 7 gün önce hatırlatalım, kararını o zaman verirsin.
> [Bana hatırlat] [Aylık plana geç] [İptale git]

*E3c — "Yeterince kullanmıyoruz" / "Çocuğum oyunu oynamak istemiyor"*
> **Bir ay bizden olsun**
> Rutini yeniden kurman için 1 ay ücretsiz. Ücretsiz ay {tarih1} tarihinde başlar, {tarih2} tarihinde biter. Sonrasında ayda {normal_fiyat} olarak kendiliğinden yenilenir; {tarih2} tarihinden önce iptal edersen ücret alınmaz.
> Rutini 3 adıma indir · Hatırlatma saatini değiştir · Ödülü yenile
> [Ücretsiz ayı kullan] [İstemiyorum, iptale git]

*E3d — "Bir sorun yaşadım"*
> **Önce çözmeyi deneyelim mi?**
> Ne olduğunu yaz, en kısa sürede dönelim.
> [Destek ekibine yaz] [İptale git]

*E3e — "Aradığım özellik yok"*
> **Hangi özelliği aradın?**
> Yazarsan sıradaki işlere ekleriz. Çocuğunun adını ya da sağlık bilgisini yazma.
> [Gönder ve iptale git]  Yazmadan iptale git

*E3f — "Artık ihtiyacımız kalmadı"*
> **Teşekkürler**
> İptal edince Premium {tarih} tarihine kadar açık kalır. Sonrasında ücretsiz planla devam edebilirsin.
> [İptale git]

*E3g — "Yanlışlıkla satın aldım"*
> **İadeyi Apple değerlendirir**
> Aşağıdan Apple'a iade talebi gönderebilirsin. Yenilemeyi durdurmak için aboneliği ayrıca iptal etmen gerekir.
> [Apple'dan iade iste] [İptale git]

*E4 — after auto-renew is switched off*
> **Aboneliğin iptal edildi**
> Premium {tarih} tarihine kadar açık. Sonrasında ücretsiz plana geçersin; yeniden ücret alınmaz.
> [Aboneliği sürdür]

*Apple Retention Message (no prices, no offer words; facts to be confirmed by the product team)*
> Başlık: **Premium dönem sonunda kapanır**
> Metin: İptal edersen Premium özellikler dönem sonunda kapanır. Kayıtların silinmez; ücretsiz planla devam edebilirsin.

**After the cancel**

| When | Channel | Content |
|---|---|---|
| Auto-renew off detected, paid period still running | In-app card on next open | E4. If they skipped our reason question (cancelled in Settings): the one question, once, dismissible. No offer on this card. |
| 3 days before expiry | Push (plain notice, allowed for everyone): "Moyo Premium üyeliğin 3 gün sonra bitiyor." In-app sheet on open. | If eligible and not offered before in this period: the reason-matched offer, with full price text. Otherwise only "Aboneliği sürdür". |
| Expiry | In-app | "Ücretsiz plandasın." What closed, stated factually; "Premium'a dön" opens the normal paywall. No discount on this day. |
| +7 days | In-app card; push/e-mail only with marketing consent | Their own numbers ("Geçen ay {n} adım tamamlandı") + one promotional offer for lapsed users: "Premium'a dönersen ilk ay {indirimli_fiyat}; sonra ayda {normal_fiyat} olarak kendiliğinden yenilenir. Teklif {tarih} tarihine kadar geçerli." The date is real. |
| +30 days | Apple shows the **win-back offer** itself (App Store, Manage Subscriptions, in-app sheet on iOS 18+); e-mail with the redemption link to consented users | Win-back offer configured in App Store Connect. |
| +90 days and school-term starts (September, February) | In-app; e-mail with consent | Last reminder, then stop. At most three offer messages after expiry. |

### 4.3 Moyo Mercek

**Entry point:** Ayarlar › Üyelik › "Aboneliği yönet" — owner only, iPhone/iPad. On the web the page keeps saying the subscription is managed in the iOS app and links to Apple's subscriptions page. Team members never see the flow.

**Reason options and what each leads to**

| Reason (shown text) | What we show next | Offer (if eligible) |
|---|---|---|
| "Şu an az danışanla çalışıyorum" | Klinik: "Bireysel plana geç". Bireysel yearly: "Aylık plana geç". | Bireysel monthly: 1 free month. |
| "Pahalı geldi" | Monthly: discount screen, with "Yıllık planda {n} ay ücretsiz" as a second link. Klinik with one active clinician: Bireysel. | 3 months at a reduced price (promotional offer). |
| "Ekibim kullanmıyor ya da ekip küçüldü" (Klinik only) | "Bireysel plana geç", with the seat consequence stated. | None (the plan switch is the answer). |
| "Aileler uygulamayı kullanmıyor" | "Görüşme iste" (a person from the team) + "Davet ipuçlarını aç". | None automatically; the team may give an offer code after the call. |
| "Bir süre ara veriyorum" | Explanation that pause does not exist on the App Store. | 1 free month. |
| "İhtiyacım olan özellik yok" | Optional free text + "Bize yaz". | None. |
| "Başka bir araca geçiyorum" | "Kayıtları dışa aktar"; optional "Hangi araca?" | None. |
| "Bir sorun yaşadım" | "Destek ekibine yaz". | None automatically. |
| "Başka bir neden" | Optional free text. | None. |

Extra rule for Mercek: a **Klinik yearly** owner who starts the flow also sees "Bize yaz" as the first alternative, and the team is notified so a person can follow up (B2B accounts are few and valuable; SimplePractice routes plan reductions through its success team [56]).

**Example copy**

*M1 — Üyelik*
> **Üyeliğin**
> Klinik · Yıllık · 10 uzmana kadar
> {fiyat}/yıl · {tarih} tarihinde kendiliğinden yenilenir
> [Planı değiştir] [Bize yaz] [Satın alımları geri yükle] [Aboneliği iptal et]

*M2 — Reason*
> **Ayrılmadan önce bir soru**
> Yanıtın yalnız ürün ekibine gider. Yanıtlamak zorunda değilsin.
> (seçenekler)
> [Devam]  Yanıtlamadan iptale git

*M3a — Klinik → Bireysel*
> **Bireysel plana geçmek ister misin?**
> Bireysel plan tek uzman içindir: {bireysel_fiyat}/ay, kendiliğinden yenilenir. Değişiklik {tarih} tarihindeki yenilemede başlar; o güne kadar Klinik planın sürer. Geçişte ekip üyelerinin erişimi kapanır.
> [Bireysel plana geç] [İstemiyorum, iptale git]

*M3b — "Pahalı geldi", monthly*
> **3 ay indirimli devam etmek ister misin?**
> İndirim {tarih} tarihindeki yenilemede başlar: 3 ay boyunca ayda {indirimli_fiyat}. Sonrasında ayda {normal_fiyat} olarak kendiliğinden yenilenir. İstediğin zaman iptal edebilirsin.
> [İndirimle devam et] [İstemiyorum, iptale git]
> Yıllık planda {n} ay ücretsiz: {yillik_fiyat}/yıl, yılda bir kendiliğinden yenilenir.

*M3c — "Bir süre ara veriyorum"*
> **Bir ay bizden olsun**
> App Store'da abonelik dondurulamıyor; onun yerine 1 ay ücretsiz. Ücretsiz ay {tarih1} tarihinde başlar, {tarih2} tarihinde biter. Sonrasında ayda {normal_fiyat} olarak kendiliğinden yenilenir; {tarih2} tarihinden önce iptal edersen ücret alınmaz.
> [Ücretsiz ayı kullan] [İstemiyorum, iptale git]

*M3d — "Aileler uygulamayı kullanmıyor"*
> **Birlikte bakalım mı?**
> Davetlerine ve ailelerin kullanımına birlikte bakıp öneri sunalım. Görüşme ücretsizdir.
> [Görüşme iste] [Davet ipuçlarını aç] [İptale git]

*M3e — "Başka bir araca geçiyorum"*
> **Kayıtlarını yanına al**
> Raporları ve tabloları dışa aktarabilirsin.
> [Dışa aktarmayı aç] [İptale git]

*M4 — after auto-renew is switched off*
> **Aboneliğin iptal edildi**
> Panel {tarih} tarihine kadar açık. Sonrasında panel kapanır; ekip üyelerinin erişimi de biter. Yeniden ücret alınmaz.
> [Aboneliği sürdür] [Kayıtları dışa aktar]

*Apple Retention Message*
> Başlık: **Panel dönem sonunda kapanır**
> Metin: İptal edersen danışan paneli ve raporlar dönem sonunda açılmaz. Ekip üyelerinin erişimi de biter.

**After the cancel**

| When | Channel | Content |
|---|---|---|
| Auto-renew off detected | In-app card; plain e-mail to the owner | M4. One question if they skipped ours. What happens to data after expiry must be stated — **open decision** (see section 7). |
| 7 days before expiry | E-mail (service notice) + in-app banner | "Moyo Mercek üyeliğin {tarih} tarihinde bitiyor." For Klinik: team access ends too. If eligible: the reason-matched alternative. |
| 1 day before | Push + in-app | Short reminder; "Aboneliği sürdür". |
| Expiry | Paywall (exists today) | Add "Bireysel planla devam et" for former Klinik owners. |
| +7 days | In-app on the paywall; e-mail if permitted | One promotional offer for lapsed owners with full price text, or an offer-code link after a call. |
| +30 days | Apple win-back offer + e-mail with redemption link | Per product. |
| +90 days, then September | E-mail if permitted | Last message, then stop. |

### 4.4 Involuntary churn (both apps)

1. Switch on **Billing Grace Period: 16 days**, "All Renewals", production and sandbox [11]. Access continues while Apple retries.
2. Let Apple's own payment sheet appear (default behaviour; iOS 16.4+) [12][34].
3. In-app banner while `billingIssueDetectedAt` is set:
   > **Ödeme alınamadı**
   > Apple abonelik ücretini alamadı. Üyeliğin {tarih} tarihine kadar açık kalır. Ödeme yöntemini güncellersen kesinti olmaz.
   > [Ödeme yöntemini güncelle]
   Mercek adds: "Ekip üyelerinin erişimi de etkilenir."
4. Plain notices (not promotions): on the day, after 3 days, 2 days before the grace period ends. Mercek also by e-mail to the owner.
5. No discount: the person did not choose to leave.
6. After the grace period: access closes, the banner stays for the rest of Apple's 60-day retry window.

### 4.5 Offers to create (prices to be decided)

Depth is a business decision; vendor data suggests starting moderate and testing, because deeper discounts did not reliably raise acceptance [59].

| Product | Promotional offers (in-app; also first 30 days after expiry) | Retention offer (Apple's cancel page) | Win-back offer (30+ days after expiry) |
|---|---|---|---|
| Parent monthly | 2 months reduced (pay as you go); 1 month free; "first month reduced" for lapsed | 2 months reduced; paid duration ≥ 1 month; wait between offers 6 months | 3 months reduced; lapsed 1–6 months |
| Parent yearly | Reduced renewal year (pay up front) | Same, with a long paid-duration threshold so it reaches people near renewal | Reduced first year; lapsed 1–12 months |
| Mercek Bireysel monthly | 3 months reduced; 1 month free | 3 months reduced; wait 12 months | 3 months reduced |
| Mercek Klinik monthly | 3 months reduced | 3 months reduced; wait 12 months | 3 months reduced |
| Mercek yearly (both) | Reduced renewal year | Reduced renewal year | Reduced first year |
| All | One custom offer code per app for support compensation | — | — |

Note: App Store Connect retention messages cannot suggest a plan switch; only the real-time API can [4]. Until then the Klinik→Bireysel suggestion lives in our in-app screen.

---

## 5. Set-up list by owner

### 5.1 App Store Connect (owner)

1. **Subscriptions › Billing Grace Period › Set Up Billing Grace Period**: 16 days, All Renewals, Production and Sandbox — both apps [11].
2. **App Information › App Store Server Notifications**: production and sandbox URLs from RevenueCat (if not already set).
3. **Users and Access › Integrations › In-App Purchase**: confirm the In-App Purchase key exists and is uploaded to RevenueCat (needed for promotional offers) [8][17].
4. For each subscription: **Subscription Prices › + › Create Promotional Offer** (reference name, identifier, type, duration, price) [8].
5. **Subscriptions › Retention Messaging › + (Get Started)**: reference name, header and body in Turkish plus the other storefront languages, attach subscriptions, then **retention offers** (identifier, countries, type, duration, price, Paid Subscription Duration, Wait Between Offers), preview, **Add for Review** [2].
6. For each subscription: **Subscription Prices › + › Create Win-Back Offer** (dates, priority, Minimum Paid Duration, Time Since Last Subscribed, Wait Between Offers, countries, price); copy the **Redemption URL** [6]. Optional: subscription image and "Promote on the App Store".
7. **Offer Codes**: one custom code per app for support, eligibility Existing + Expired [10].
8. Check the ranking inside "Moyo Mercek Üyelik" (Klinik above Bireysel) so the downgrade behaves as described [12].
9. Leave **Streamlined Purchasing** on (default) so win-back redemptions outside the app complete without extra code [7].
10. Later: fill in Apple's **Retention Messaging API** interest form [16].

### 5.2 RevenueCat dashboard (owner)

1. App settings › **In-app purchase key configuration**: key uploaded for both apps [17].
2. App settings › **Apple Server Notification** URL copied into App Store Connect (step 5.1.2).
3. **Integrations › Webhooks**: the existing `billing-webhook` receives all event types, including `CANCELLATION`, `UNCANCELLATION`, `BILLING_ISSUE`, `EXPIRATION`, `PRODUCT_CHANGE` [21].
4. Charts to watch: App Store Save Rate / Save Outcomes (retention messages) [32].
5. Optional: **Lifecycle › Retention › Customer Center** if the ready-made screen is chosen; add the promotional offer ids there [19][20].
6. Later: **Lifecycle › Retention › Apple Retention Messaging API** once Apple grants access [22].

### 5.3 Server (Supabase; contract change goes to `ortak` first)

1. `billing-webhook`: store per subscription `will_renew`, `unsubscribe_detected_at`, `cancel_reason`, `billing_issue_at`, `grace_expires_at`, `expires_at`, current offer id/type.
2. New table for cancel feedback (who, product, reason key, optional text, offer shown, outcome) and a log of offers shown/accepted for the frequency caps; row-level security; tests.
3. RPC "what may this subscriber be offered now" (applies the eligibility table in 4.1) and RPC "record flow step".
4. Scheduled job for the timed messages (3 days / 7 days before expiry, +7, +30, +90), respecting marketing consent; push through the existing `push-apns`, e-mail through the existing mail function.
5. Mercek: apply the seat limit when a Klinik subscription renews as Bireysel; notify affected team members.
6. Remote flag `cancel_flow` and the offer identifiers in `client_config`, so the flow can be tuned or switched off without a release.

### 5.4 Each app

1. Screens: Üyelik (manage), reason, alternative/offer, post-cancel card, billing-issue banner, lapsed-user sheet.
2. RevenueCat calls (all present in 10.16.0 [34]):
   - State: `Purchases.getCustomerInfo()` → entitlement `willRenew`, `unsubscribeDetectedAt`, `billingIssueDetectedAt`, `expirationDate`; add a customer-info listener to refresh after Apple's sheet closes.
   - Cancel exit: `Purchases.showManageSubscriptions()`; fallback `customerInfo.managementURL`.
   - Save offer: `Purchases.getPromotionalOffer(product, discount)` → `Purchases.purchaseDiscountedPackage(pkg, offer)`.
   - Plan switch: normal `purchasePackage` of the other product in the group.
   - Win-back (iOS 18+): `Purchases.getEligibleWinBackOffersForPackage(pkg)` → `Purchases.purchasePackageWithWinBackOffer(pkg, offer)`.
   - Offer code: `Purchases.presentCodeRedemptionSheet()`.
   - Refund: `Purchases.beginRefundRequestForActiveEntitlement()`.
   - Billing message: leave automatic store messages on, or call `Purchases.showInAppMessages([IN_APP_MESSAGE_TYPE.BILLING_ISSUE])`.
3. If Customer Center is chosen instead: add `react-native-purchases-ui` (8.7.0+, matching the 10.x line), call `RevenueCatUI.presentCustomerCenter()` [18].
4. Usage events: flow opened, reason chosen, alternative shown, offer shown, offer accepted, exit to Apple, cancel detected, reactivated, win-back shown/accepted, billing banner shown, billing recovered.
5. Test in sandbox: retention message display (also inside the in-app sheet), promotional offer on a subscription whose auto-renew is off, the downgrade path, grace period.

### 5.5 Suggested order

| Phase | Content | Needs code? |
|---|---|---|
| 0 | Billing Grace Period; text-only Retention Message (Turkish, plus a localisation for every other storefront where the subscription is sold [2]) | No (owner only) |
| 1 | In-app manage screen, reason question, plan switch, post-cancel card, billing banner; webhook state | Yes |
| 2 | Promotional offers in-app; retention offers on Apple's page; holdout group | Yes + owner |
| 3 | Win-back offers, timed messages, offer codes, Mercek "Görüşme iste" | Yes + owner |
| 4 | Real-time Retention Messaging API through RevenueCat (switch-plan messages); experiments | After Apple access |

---

## 6. Metrics

| Metric | Definition |
|---|---|
| In-app flow save rate | Entered the flow and still auto-renewing 7 days later ÷ entered the flow. Compare with the holdout group. |
| Apple-page save rate | RevenueCat "App Store Save Rate" chart for retention messages [32]. |
| Offer acceptance | Accepted ÷ shown, per reason and per offer. |
| Net revenue saved | Revenue kept from savers minus discount given, against the holdout. |
| Re-churn after discount | Share who turn auto-renew off within 60 days after the discounted period ends, against comparable non-discount subscribers. |
| Reactivation | `UNCANCELLATION` events ÷ `CANCELLATION` events (voluntary) during the paid period. |
| Win-back | Share of expired subscribers who resubscribe within 30 / 90 days, by offer. |
| Involuntary recovery | Billing issues recovered inside the grace period, and inside 60 days. |
| Reason mix | Share of each reason per plan; feeds the roadmap. |
| **Guardrails** | Refund requests per 100 subscribers; 1–2 star reviews and support tickets mentioning cancellation; complaints to consumer bodies; share skipping the reason question; taps and seconds from "Aboneliği yönet" to Apple's sheet. If a guardrail worsens, switch the offer step off with the remote flag. |

---

## 7. Legal and compliance notes

Not legal advice. Items marked **needs lawyer** should go to the legal archive before launch.

### Turkey

- **Right to terminate.** Consumer Law no. 6502 art. 52 and the Abonelik Sözleşmeleri Yönetmeliği (Official Gazette 24 Jan 2015, no. 29246): a consumer may end an indefinite-term subscription, or a fixed-term one of a year or longer, at any time without reason or penalty; notice on paper or a durable medium is enough; the provider may not set a termination method heavier than the one used to subscribe; the request must be carried out within seven days. For subscriptions other than utilities and telecoms only certain articles apply, including the termination ones. Read through law-firm summaries; article numbers differ between sources [64][65].
- **Dark patterns.** The amendment of 1 Feb 2022 (Official Gazette 31737, in force 1 Mar 2022) added to the annex of unfair practices: using guiding interface designs, options or wording that negatively affect the consumer's will to decide or choose, or that aim at changes in the seller's favour [66][68]. The Advertising Board has applied it to cancellation screens: cancel options that are small, pale or hard to notice, and unrelated content pushed during cancellation; it issued stop orders and fines (February 2025 meeting; subscription sweep announced September 2024) [67][68]. Design consequence: our cancel exit must be as visible as the "stay" option on every screen.
- **2026 amendment** (Official Gazette 1 Jul 2026 no. 33297, in force 1 Aug 2026): targeted advertising transparency, AI disclosure, reviews, discount claims; commentators say it widens the frame used against dark patterns [69]. If offers differ per person, check the targeted-advertising transparency duty — **needs lawyer**.
- **Coming change.** The Ministry of Trade said in 2026 it is re-working subscription rules after 1,459 complaints about digital subscriptions; content and date unknown [70]. Building for one-tap cancellation now is the safe choice.
- **Discount wording.** Turkish rules on discount advertising (reference price over the previous 30 days) were seen only as a headline [76]. Showing actual prices instead of "%50 indirim" lowers the risk; Marketing §7.1 check before release — **needs lawyer**.
- **Promotional messages.** Law no. 6563 and İYS: promotional e-mail/SMS need prior consent from consumers; merchants and tradespeople follow an opt-out regime; whether a push notification with an offer counts was not settled in the sources found [72]. Whether therapists count as merchants/tradespeople is unclear — **needs lawyer**. Plain service notices ("your subscription ends on…") are treated here as non-promotional; confirm.
- **Who is the seller?** With App Store billing we cannot cancel or refund; Apple does. Whether a cancellation request sent to us directly (e-mail, in-app) creates a duty, and how yearly prepaid periods are treated on termination — **needs lawyer**.
- **KVKK.** Cancel reasons, free text and offer history are personal data; update the privacy notices; keep child and health details out of the free-text box (the copy says so).

### Apple

- Keep the system cancel UI easy to reach [12]; no manipulative practices (5.6) [14]; promotional push only with in-app opt-in (4.5.4) [14]; retention message text without prices or pressure [2].

### For comparison

- **United States.** The FTC's "click-to-cancel" rule was vacated by the Eighth Circuit in July 2025 on procedural grounds; the FTC restarted rulemaking with an advance notice in March 2026; no new rule yet. Enforcement continues under ROSCA (Amazon USD 2.5B; Adobe proposed USD 150M) [73][51][52]. California's renewal law (in force 1 Jul 2025) allows a save offer only if a clearly labelled cancel button is shown at the same time, next to it (law-firm summaries) [74] — the same rule this design follows.
- **European Union.** A mandatory online "withdrawal function" applies from 19 June 2026 (Directive 2023/2673) [75]. The Commission presented the Digital Fairness Act proposal on 11 Nov 2026 (easier cancellation, limits on dark patterns, large fines) according to press reports; it is a proposal, not law [75]. Germany's cancel-button rule and the UK regime were not verified in this research.

### Open questions

1. Data after a Mercek subscription ends: how long is it kept, can the owner export after expiry? The copy needs a true sentence here.
2. Exactly what closes and what stays on the parent free plan (for the factual loss statements).
3. Offer depth and final prices; whether yearly plans get any cancel-moment discount at all.
4. Custom flow or RevenueCat Customer Center.
5. Who answers "Görüşme iste" for Mercek, and within what time.
6. The legal items above.

### Not verified in this research

- Duolingo's actual cancel screens and whether any discount is shown there (no primary teardown found).
- Offer details for Spotify, Audible, NYT, Calm, Peloton, Strava, Blinkist, Notion, Zoom (third-party guides only).
- RevenueCat documentation pages could not be opened; statements come from search summaries plus the installed SDK. Not confirmed: Customer Center Turkish localisation, plan requirement, full React Native callback list; exact `cancel_reason` list; whether RevenueCat exposes renewal-date extension.
- Apple: character limits of retention messages; units of "Paid Subscription Duration"; whether the retention message also shows inside the in-app manage sheet (Apple says the sheet is "the same" as Settings [13]; test in sandbox); whether accepting a promotional offer after switching auto-renew off turns renewal back on (expected; test in sandbox).
- Exact wording and article numbers of the Turkish regulations (official texts not opened).

---

## 8. Sources

**Apple**

1. Apple Developer News — Now available: Retention messages for subscriptions (4 Nov 2026) — https://developer.apple.com/news?id=fk9ps3gv
2. App Store Connect Help — Configure retention messages in App Store Connect — https://developer.apple.com/help/app-store-connect/manage-subscriptions/configure-retention-messages
3. Apple Developer Documentation — Retention Messaging API — https://developer.apple.com/documentation/retentionmessaging
4. Apple Developer Documentation — Setting up retention messages — https://developer.apple.com/documentation/retentionmessaging/setting-up-retention-messages
5. WWDC26 session 309 — Explore Retention Messaging in App Store Connect — https://developer.apple.com/videos/play/wwdc2026/309/
6. App Store Connect Help — Set up win-back offers — https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-win-back-offers/
7. Apple Developer Documentation — Supporting win-back offers in your app — https://developer.apple.com/documentation/storekit/supporting-win-back-offers-in-your-app
8. App Store Connect Help — Set up promotional offers for auto-renewable subscriptions — https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-promotional-offers-for-auto-renewable-subscriptions
9. Apple Developer Documentation — Implementing promotional offers in your app — https://developer.apple.com/documentation/storekit/implementing-promotional-offers-in-your-app
10. App Store Connect Help — Set up offer codes — https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-offer-codes
11. App Store Connect Help — Enable Billing Grace Period for auto-renewable subscriptions — https://developer.apple.com/help/app-store-connect/manage-subscriptions/enable-billing-grace-period-for-auto-renewable-subscriptions
12. Apple — Auto-renewable subscriptions (App Store) — https://developer.apple.com/app-store/subscriptions/
13. Apple Developer Documentation — showManageSubscriptions(in:) — https://developer.apple.com/documentation/storekit/appstore/showmanagesubscriptions(in:)
14. Apple — App Review Guidelines (3.1.2, 4.5.4, 5.6) — https://developer.apple.com/app-store/review/guidelines/
15. Apple Developer News — Now Available: Monthly Subscriptions with a 12-Month Commitment — https://developer.apple.com/news/?id=agq42lxe ; 9to5Mac coverage — https://9to5mac.com/2026/04/27/apple-introduces-monthly-subscriptions-with-a-12-month-commitment/
16. Apple — Request access to the Retention Messaging API — https://developer.apple.com/contact/request/retention-messaging-api/

**RevenueCat**

17. RevenueCat Docs — iOS Subscription Offers — https://www.revenuecat.com/docs/subscription-guidance/subscription-offers/ios-subscription-offers
18. RevenueCat Docs — Customer Center: React Native — https://www.revenuecat.com/docs/tools/customer-center/customer-center-react-native
19. RevenueCat Docs — Customer Center configuration — https://www.revenuecat.com/docs/tools/customer-center/customer-center-configuration
20. RevenueCat Docs — Customer Center promotional offers (Apple) — https://www.revenuecat.com/docs/tools/customer-center/customer-center-promo-offers-apple
21. RevenueCat Docs — Webhooks: event types and fields — https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields ; event flows — https://www.revenuecat.com/docs/integrations/webhooks/event-flows
22. RevenueCat Docs — Apple Retention Messaging API — https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-retention-messaging-api
23. RevenueCat Blog — Apple retention messaging — https://www.revenuecat.com/blog/growth/apple-retention-messaging
24. RevenueCat Blog — Apple retention messaging benchmarks — https://www.revenuecat.com/blog/growth/apple-retention-messaging-benchmarks
25. RevenueCat Blog (engineering) — Apple Retention Messaging API — https://www.revenuecat.com/blog/engineering/apple-retention-messaging-api/
26. RevenueCat Docs — How grace periods work — https://www.revenuecat.com/docs/subscription-guidance/how-grace-periods-work
27. RevenueCat Blog — The beginner's guide to Apple win-back offers — https://www.revenuecat.com/blog/growth/guide-to-apple-win-back-offers
28. RevenueCat Blog — Cancellation flow best practices — https://www.revenuecat.com/blog/growth/app-cancellation-flow-best-practices ; Customer Center GA note — https://www.revenuecat.com/release/customer-center-ga-2024-12-12
29. RevenueCat — State of Subscription Apps 2026 — https://www.revenuecat.com/state-of-subscription-apps/ ; summary — https://ppc.land/95-of-annual-app-subscribers-who-cancel-never-return-revenuecat-finds/
30. RevenueCat Blog — Exit offers in RevenueCat Paywalls — https://www.revenuecat.com/blog/engineering/exit-offers-in-revenuecat-paywalls
31. RevenueCat Docs — Expo installation — https://www.revenuecat.com/docs/getting-started/installation/expo
32. RevenueCat Docs — App Store Save Rate conversion chart — https://www.revenuecat.com/docs/dashboard-and-metrics/charts/app-store-save-rate-conversion-chart ; Experimenting with retention messaging — https://www.revenuecat.com/docs/tools/experiments-v1/experimenting-with-retention-messaging
33. RevenueCat Community — Redeeming a promotional offer on the same product — https://community.revenuecat.com/general-questions-7/redeeming-ios-promotion-offer-on-the-same-subscription-product-1140
34. Installed SDK, `react-native-purchases` 10.16.0 type definitions — repo file `clinic-app/node_modules/react-native-purchases/dist/purchases.d.ts` and `@revenuecat/purchases-typescript-internal`

**Benchmarks**

35. Duolingo Help Center — How do I cancel my Super Duolingo subscription? — https://www.duolingo.com/help/cancel-my-super-duolingo-subscription
36. RecurDash — How to cancel Super Duolingo (third-party) — https://recurdash.com/guides/how-to-cancel-duolingo-plus
37. Duolingo Blog — Engineering impact at Duolingo: building the New Year's Promotion — https://blog.duolingo.com/engineering-new-year-promotion/
38. Duolingo Help Center — How do I use a promo code? — https://www.duolingo.com/help/use-a-promo-code
39. Don't Bury the Lede — Duolingo's Streak Revival campaign (secondary) — https://dontburythelede.substack.com/p/duolingo-brought-back-154-million
40. Opinions and Conditions — The Duolingo Owl, Dark Patterns, and Digital Guilt (opinion) — https://opinionsandconditions.substack.com/p/duolingo-owl-dark-patterns-digital-guilt
41. Netflix Help — How to cancel Netflix — https://help.netflix.com/en/node/407 ; How to restart your membership — https://help.netflix.com/en/node/2070 ; Billing through Apple — https://help.netflix.com/en/node/25097
42. Spotify Support — How to cancel Premium plans — https://support.spotify.com/sa-en/article/cancel-premium/ ; Spotify Newsroom, win-back offers — https://newsroom.spotify.com/tag/winback-offer/
43. YouTube Help — Pause or resume YouTube Premium — https://support.google.com/youtube/answer/11950175 ; Cancel — https://support.google.com/youtube/answer/6308278
44. Audible Help — Before you cancel your Audible membership — https://help.audible.com/s/article/before-you-cancel-your-audible-membership ; Pause your membership — https://help.audible.co.uk/s/article/pause-your-membership
45. Nieman Lab — The end of "click to subscribe, call to cancel" (2021) — https://www.niemanlab.org/2021/11/the-end-of-click-to-subscribe-call-to-cancel-one-of-the-news-industrys-favorite-retention-tactics-is-illegal-ftc-says/ ; third-party NYT guide — https://frugavo.com/learn/how-to-cancel-nyt
46. Headspace Help — Cancel if subscribed on Apple App Store or Google Play — https://help.headspace.com/hc/en-us/articles/115014780447-How-do-I-cancel-my-subscription-if-I-subscribed-on-Apple-App-Store-or-Google-Play ; How do I cancel — https://help.headspace.com/hc/en-us/articles/115008364988-How-do-I-cancel-my-subscription
47. Calm Support — How to redeem Calm promotional offers — https://support.calm.com/hc/en-us/articles/6294489815579-How-to-Redeem-Calm-Promotional-Offers-Discounts
48. Peloton, third-party guides — https://recurdash.com/guides/how-to-cancel-peloton ; https://www.cancelmanual.com/services/peloton-app
49. Strava, third-party guides — https://recurdash.com/guides/how-to-cancel-strava ; https://www.lowermysubs.com/blog/strava-retention-offer
50. Blinkist, third-party guide — https://recurdash.com/guides/how-to-cancel-blinkist
51. Engadget — Adobe agrees to pay settlement for making its subscriptions hard to cancel — https://www.engadget.com/big-tech/adobe-agrees-to-pay-settlement-for-making-its-subscriptions-hard-to-cancel-210336635.html ; Subscription Insider — https://www.subscriptioninsider.com/article-type/news/adobe-moves-to-settle-u-s-case-over-subscription-fees-and-cancellation-practices-with-150-million-package
52. Axios — Amazon reaches $2.5 billion settlement over FTC's Prime lawsuit — https://axios.com/2025/09/25/amazon-prime-ftc-settlement ; ConsumerAffairs — https://www.consumeraffairs.com/news/amazon-to-pay-25-billion-over-prime-sign-up-cancellation-tactics-092525.html
53. Canva Help — Pause your plan — https://www.canva.com/help/pause-annual-canva-plan/ ; Cancel — https://www.canva.com/en/help/cancel-canva-plan/
54. Notion Help — What happens when I downgrade my plan? — https://www.notion.com/help/plan-downgrade ; third-party — https://recurdash.com/guides/how-to-cancel-notion
55. Zoom Community — Subscription renewal discount — https://community.zoom.com/billing-account-management-32/zoom-subscription-renewal-discount-67729 ; Aakash Gupta, Product Growth — https://www.news.aakashg.com/p/anticonversions
56. SimplePractice Help — Cancelling your account — https://support.simplepractice.com/hc/en-us/articles/11462507018253 ; Preparing your account for a leave of absence — https://support.simplepractice.com/hc/en-us/articles/10116306351885-Preparing-your-SimplePractice-account-for-a-leave-of-absence
57. FunnelFox Blog — Subscription cancellation flow: do's, don'ts and real-life examples (vendor) — https://blog.funnelfox.com/cancellation-flows-examples-and-best-practices/

**Data**

58. Churnkey — State of Retention 2025 — https://churnkey.co/reports/state-of-retention-2025 ; blog — https://churnkey.co/blog/state-of-retention-report-2025
59. Churnkey — Voluntary churn benchmarks — https://churnkey.co/blog/voluntary-churn-benchmarks/ ; Discounting at cancellation — https://churnkey.co/blog/discounting-at-cancellation ; Reduce subscription churn — https://churnkey.co/articles/reduce-subscription-churn
60. Recurly — State of Subscriptions — https://recurly.com/resources/report/state-of-subscriptions/ ; Pause: why it matters — https://docs.recurly.com/recurly-subscriptions/docs/navigate-retain-subscription-pause-why-it-matters
61. ProsperStack — Case studies — https://prosperstack.com/customers/ ; Churn prevention — https://discover.prosperstack.com/churn-prevention
62. Paddle — Retain cancellation flows — https://developer.paddle.com/concepts/retain/cancellation-flows-surveys ; https://www.paddle.com/retain/cancellation-flows
63. Userpilot — Cancellation flow examples — https://userpilot.com/blog/cancellation-flow-examples/

**Rules**

64. Abonelik Sözleşmeleri Yönetmeliği (text copies) — https://www.alomaliye.com/2015/01/24/abonelik-sozlesmeleri-yonetmeligi/ ; https://www.lexpera.com.tr/mevzuat/yonetmelikler/abonelik-sozlesmeleri-yonetmeligi-1
65. Erdem & Erdem — Abonelik Sözleşmelerinin Sona Erdirilmesi — https://www.erdem-erdem.av.tr/bilgi-bankasi/abonelik-sozlesmelerinin-sona-erdirilmesi ; Kulaçoğlu — https://kulacoglu.av.tr/abonelik-sozlesmesinin-feshi-ve-haksiz-abonelik-ucretleri/ ; Hukukçular Evi — https://hukukcularevi.com/abonelik-sozlesmesi-iptali/
66. Official Gazette 1 Feb 2022 no. 31737 (copy) — https://www.turmob.org.tr/arsiv/mbs/resmigazete/31737-4.pdf ; https://www.alomaliye.com/2022/02/01/ticari-reklam-ve-haksiz-ticari-uygulamalar-01-02-2022/
67. Ministry of Trade — Reklam Kurulu tarafından karanlık ticari tasarımlar incelemeye alındı — https://ticaret.gov.tr/haberler/reklam-kurulu-tarafindan-karanlik-ticari-tasarimlar-incelemeye-alindi ; Abonelik hizmetlerine ilişkin tasarım tuzakları — https://ticaret.gov.tr/haberler/ticaret-bakanligi-reklam-kurulu-abonelik-hizmetlerine-iliskin-tasarim-tuzaklarina-dikkat-cekiyor ; February 2025 decisions — https://ticaret.gov.tr/haberler/ticaret-bakanligi-reklam-kurulundan-tuketici-yorumlarina-ve-finansal-hizmetlere-iliskin-reklamlara-30-2-milyon-tl-para-cezasi-ve-yaptirim-kararlari
68. Mondaq — Dark patterns in light of Advertising Board decisions and foreign regulations — https://www.mondaq.com/turkey/advertising-marketing-branding/1642914/dark-patterns-in-light-of-advertising-board-decisions-and-foreign-regulations ; DergiPark article on dark commercial patterns — https://dergipark.org.tr/en/download/article-file/4918324
69. 2026 amendment — https://www.alomaliye.com/2026/07/01/reklam-yonetmeliginde-kapsamli-degisiklik/ ; Ministry of Trade — https://ticaret.gov.tr/haberler/aldaticici-reklam-ve-haksiz-ticari-uygulamalarla-mucadelede-yeni-donem-basliyor ; Mondaq — https://www.mondaq.com/turkey/consumer-trading-unfair-trading/1816566/dark-patterns-under-turkish-law-a-current-assessment-in-light-of-the-2026-amendments-to-the-regulation-on-commercial-advertising-and-unfair-commercial-practices
70. Dünya — Dijital aboneliklerde onaysız yenileme mercek altında — https://www.dunya.com/ekonomi/dijital-aboneliklerde-onaysiz-yenileme-mercek-altinda-bakanlik-inceleme-baslatti-haberi-844536 ; Memurlar.net — https://www.memurlar.net/haber/1181547/ticaret-bakanligi-abonelik-sozlesmelerini-yeniliyor.html
71. Webrazzi — Ticaret Bakanlığı, dijital abonelik platformlarına 166 milyon lira ceza verdi (2023) — https://webrazzi.com/2023/11/17/ticaret-bakanligi-dijital-abonelik-platformlarina-166-milyon-lira-ceza-verdi/
72. Law 6563 / İYS — https://cottgroup.com/tr/mevzuat/item/ileti-yonetim-sistemi-ve-yeni-uygulamalar ; regulation text — https://www.lexpera.com.tr/mevzuat/yonetmelikler/ticari-iletisim-ve-ticari-elektronik-iletiler-hakkinda-yonetmelik
73. DLA Piper — FTC's click-to-cancel rule voided — https://www.dlapiper.com/en-gl/insights/publications/2025/07/ftcs-click-to-cancel-rule-voided ; Gibson Dunn — FTC restarts negative option rulemaking — https://www.gibsondunn.com/ftc-restarts-negative-option-rulemaking-after-eighth-circuit-vacatur-enforcement-under-rosca-continues/
74. Arnold & Porter — New California requirements for subscriptions in 2025 — https://www.arnoldporter.com/en/perspectives/advisories/2025/01/new-california-requirements-for-subscriptions-in-2025 ; Fenwick — https://fenwick.com/insights/publications/california-tightens-requirements-for-automatically-renewing-subscriptions
75. Greenberg Traurig — EU withdrawal button requirements — https://www.gtlaw.com/en/insights/2026/5/eu-consumer-law-new-withdrawal-button-requirements-for-online-contracts ; The Next Web — Digital Fairness Act — https://thenextweb.com/news/eu-digital-fairness-act-loot-boxes-dark-patterns
76. Ekonomist — İndirimli satışlarda 30 gün şartı (headline only, not read) — https://www.ekonomist.com.tr/haberler/indirimli-satislarda-yeni-donem-30-gun-sarti-getirildi-28813

**Internal**

77. Repo files: `ortak/CANLIYA_ALMA.md` (products, groups, server-side trials), `ortak/hukuk/45-pazarlama-kurallari.md` (§1.5, §4.1), `ortak/supabase/functions/billing-webhook/index.ts`
