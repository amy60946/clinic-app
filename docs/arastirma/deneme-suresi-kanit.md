# Free-trial length (7 vs 14 days): evidence review

Prepared 18 November 2026. Scope: evidence on how trial length affects trial starts, trial-to-paid conversion, retention and revenue in subscription apps, read for a parent-facing family app whose trial is **cardless, starts at sign-up, never auto-charges, and falls back to a limited free plan** (a "reverse trial"), launching in Turkey, with one neutral reminder 3 days before the trial ends.

## How to read this report (important limits)

**Most sources could not be opened.** This session's network allow-list blocked almost every research host (RevenueCat, Adapty, Superwall, SaaStr, arXiv, INFORMS, SSRN, Growth.Design, support.apple.com, support.google.com, ticaret.gov.tr and Turkish law-firm sites). What that means for each claim:

- **[O] = opened and read** in this session. These are: Apple developer pages and Apple Media Services Terms, Android developer pages, two open-access papers read in full text through Europe PMC, and App Store listings read through Apple's public search API.
- **[S] = snippet only.** The figure comes from the search tool's summary of the page, not from the page itself. Search summaries can mis-transcribe numbers and mix editions. Where two summaries disagreed, both figures are given. **Every RevenueCat, Adapty, Superwall, ChartMogul, First Page Sage figure, the Yoganarasimhan et al. paper, the Blinkist case and all Turkish legal material are [S].**
- Numbers are quoted as reported, not rounded. "Opinion" and "data" are labelled separately.

Structural limits that apply even to the verified material:

1. **Nearly all mobile benchmarks describe store introductory offers** (payment method on file, auto-renewing, opt-out). In those, "trial-to-paid" includes people who simply did not cancel. A cardless trial has no such inertia, so store conversion rates of 25–47% are **not** a forecast for this product.
2. **The only randomized comparison of 7 vs 14 days is from one B2B/prosumer SaaS firm**, not a consumer mobile app.
3. **No source tests 7 vs 14 days for a cardless consumer trial with a free fallback.** That exact question is unanswered in the published evidence.
4. Benchmarks by trial length are **observational**: apps choose their trial length, and apps with longer trials differ in category, plan and price.

Hosts to allow if the snippet-only figures need to be verified: `www.revenuecat.com`, `adapty.io`, `superwall.com`, `www.saastr.com`, `arxiv.org`, `faculty.washington.edu`, `papers.ssrn.com`, `growth.design`, `www.growthunhinged.com`, `amplitude.com`, `firstpagesage.com`, `chartmogul.com`, `support.apple.com`, `support.google.com`, `android-developers.googleblog.com`, `ticaret.gov.tr`, `turkishlawblog.com`, `gun.av.tr`, `subclub.com`, `www.businessofapps.com`.

---

## 1. Industry data on trial length in mobile subscription apps

All figures in this section are **[S]** and all describe **store trials with a payment method on file** unless stated.

### 1.1 RevenueCat, State of Subscription Apps

**How common each trial length is**

| Edition | Figure | Source |
|---|---|---|
| 2025 report (2024 data) | 52% of trials ran 5–9 days in 2024, up from 48.5% in 2023; trials of 4 days or less declined | [14], [19] |
| 2026 report | Trials of 4 days or less rose from 42.1% (2025) to 46.5% (2026). Sources disagree on whether the denominator is trials or apps | [10], [13] |
| 2026 report, by category | Gaming 73% at ≤4 days; Health & Fitness 54% at 5–9 days; Education 50.3% at 5–9 days | [10] |
| 2025 report, by category | Education and Health & Fitness: "over 80% lasting 5–9 days or more"; Gaming 96.3% at ≤4 days | [14] |

The full share for 10–16 and 17–32 days was not found in any snippet. The 2026 report is reported to call 5–9 days "a sweet spot balancing length and conversion" [10] (their wording, an interpretation).

**Trial-to-paid conversion by trial length (median across apps)**

| Source | ≤4 days | 5–9 days | 10–16 days | 17–32 days |
|---|---|---|---|---|
| 2025 report, all plans | "under 27%" (secondary) | not found | not found | 45.7% |
| 2026 report, all plans | 25.5% | not found | not found | 42.5% |
| Sept 2026 analysis, **monthly** plans | 39.6% | 45.9% | 46.6% | 43.7% |
| Sept 2026 analysis, **annual** plans | ~24% | 33% | 43% | 44.6% |
| Sept 2026 analysis, **weekly** plans | 22% | 24% | — | — |

Sources: [10], [11], [14], [16], [19], [20]. The September 2026 analysis ("How long should your free trial be? Data from 17,000+ apps", dated 28 Sep 2026) covers August 2025 to July 2026, uses median app-level rates, and is reported to look at the 100 apps with most trial starts per category and plan duration [11].

What this table shows for the 7-vs-14 question: on **monthly** plans, 5–9 days and 10–16 days are practically the same (45.9% vs 46.6%). On **annual** plans the 10–16-day group is 10 points higher than the 5–9-day group (43% vs 33%).

**Other findings from the same analysis [11], [16]**

- Annual plans: first-renewal rate among payers reported as 18.3% after trials of ≤4 days rising to 47.5% after 17–32 days (the 47.5% endpoint was not visible in RevenueCat's own table in the snippets).
- AI apps: monthly conversion fell from 38.5% to 31.8% once trials went past 16 days.
- RevenueCat's own caveats, as quoted: "there's no single trial length that leads on every measure" and "the people who convert after that longer look might already be the ones less likely to cancel" (selection, not causation).

**Region [11], [16], [10]**

- **Monthly plans, Middle East & Africa: 38.3% at 5–9 days versus 27.4% at 17–32 days.** In MEA, India & Southeast Asia and Latin America, monthly conversion is highest in the 5–9-day group.
- RevenueCat's MEA region includes Turkey (per its 2026 gaming report: Saudi Arabia, South Africa, UAE, Egypt, Nigeria, Kenya, Turkey).
- Annual plans: conversion rises through 10–16 days in every region; North America and Western Europe keep rising with longer trials.
- 2026 report: "MEA shows fastest conversion (63.5% on Day 0)".
- Day-35 download-to-paid medians (third-party summary): North America 2.6%, Western Europe 2.0%, MEA 1.9%, Asia-Pacific 1.7%, Latin America 1.5%.
- Business of Apps (2026 page): North America has the highest download-to-trial rate at 7.3%; North America and Asia Pacific are tied for the highest trial-to-paid rate [18]. No Turkey or MEA figure in the snippet.

**Category conversion (not by trial length)**

- 2025 report: Travel 48.7%, Media & Entertainment 43.8%; Health & Fitness 39.9% (secondary only) [14].
- 2024 report: Travel 54.3%, Shopping 45.4%, Health & Fitness 44.5%; average trial conversion 37.3%, down from 40.5% the year before [15].
- No "Kids" or "Family" category was found in any edition. Education conversion by trial length was not found.

**When cancellations happen** (figures disagree across summaries)

- "55% of 3-day trial cancellations happen on Day 0, falling to about 31% for 30-day trials" [17].
- "84% of 3-day trial cancellations and 64% of 7-day trial cancellations happen between day 0–1" [12].

**Paywall model (2026 report)**: median Day-35 download-to-paid 10.7% for hard paywalls versus 2.1% for freemium apps [10]. The freemium figure is the closer reference point for a cardless trial with a free fallback.

### 1.2 Adapty, State of in-app subscriptions

- 2025 edition (11,000+ apps, $1.9B): most categories favour 0–3-day trials (70–96% of trials); Health & Fitness uses more 4–7-day trials (32%). Trial users' LTV "up to 64% higher" [21].
- 2026 edition (16,000+ apps, $3B): global trial-to-paid 25.6% (one secondary source says 27.8%); Health & Fitness 35.0%, Entertainment 19.1% [22].
- 2026: 89.4% of trial starts happen on Day 0 (87–90% across regions). **Education is the outlier: 71.3% on Day 0 and 23.5% at 31+ days** [22], [26].
- 2026, Adapty's position (opinion backed by their data): "trial length is secondary to Day 0 experience" [23].
- State of Paywalls 2026: 3-day trials perform better on weekly plans; 7-day trials perform better on monthly and annual plans [24].
- Third-party summary, **unverified**: 14-day trials underperform 7-day trials in 11 of 13 categories in Adapty's 2026 data.
- No conversion table for exact 3/7/14-day trials was found. A table attributed to Adapty (26.8% / 37.3% / 42.1% / 48.8% by length bucket) appears only in secondary reproductions and repeats numbers that belong to other statistics; it is **not used** here. Adapty's own trial-conversion post [25] is reported to repeat RevenueCat's "5 to 9 days, used by 52%" figure.

### 1.3 Superwall and others

- Superwall, State of App Monetization 2026: 7-day trials beat 3-day trials at every revenue tier (35% vs 29% trial-to-paid at $100K–$500K monthly revenue); 63% of apps under $500/month run 3-day trials. No 14-day figure [27].
- The Paywall Index (10,000+ apps): 7-day trials have 10% higher paywall-view-to-paid conversion than 3-day trials; effect larger on Android [28].
- Purchasely (via a roundup): 24.0% of cancellations occur within the first 24 hours of a trial. No trial-length conversion data found.
- Qonversion, Apphud: nothing found on trial length.

### 1.4 Reading of section 1

The industry data compares **3 days vs 7 days** far more than 7 vs 14. Where the 7-vs-14 contrast exists (RevenueCat buckets), monthly plans show no meaningful difference, annual plans favour 10–16 days, and the one regional cut that includes Turkey favours 5–9 days on monthly plans. All of it is card-on-file and observational.

---

## 2. Controlled experiments and academic work

### 2.1 Yoganarasimhan, Barzegary & Pani (2023), Management Science 69(6):3220–3240 — **[S]**

"Design and Evaluation of Optimal Free Trials" (earlier title: "Design and Evaluation of Personalized Free Trials"). [29], [30]

- **Design:** a leading SaaS firm randomly assigned 337,724 new users who had started a free trial to 7, 14 or 30 days. 30 days was the firm's standard. Users are reported to have learned their trial length only after starting.
- **Subscription rates:** 15.36% (7 days), 14.96% (14 days), 14.67% (30 days).
- **Headline:** the 7-day trial for everyone was the best uniform policy, a 5.59% increase in subscriptions over the 30-day baseline. The 14-day trial did not significantly increase subscriptions over 30 days.
- **Long-run outcomes** (as summarised by Science Says): 7 days vs 30 days gave 6.4% better retention and 7.9% higher revenue.
- **Mechanism:** the authors rule out demand cannibalization (free-riding), find support for consumer learning, and identify a negative effect of **long stretches of inactivity** in longer trials.
- **For whom longer trials worked better:** skilled and experienced users (less likely to be students or hobbyists). Beginners responded better to short trials.
- **Personalization:** 6.8% improvement over 30-days-for-all, against 5.59% for 7-days-for-all, so the gain from personalizing was small.

Caveats for this product:

- The 7-vs-14 gap is 0.40 percentage points (about 2.7% relative). The clearly significant contrast is 7 vs 30.
- One firm, desktop/prosumer software, not a consumer mobile app and not a family product.
- Randomization happened after the trial started, so it says **nothing about the effect of trial length on trial starts or sign-ups**.
- Whether a payment method was required could not be verified.
- Only 7, 14 and 30 days were tested.

### 2.2 Zhang & Duan (2025), Frontiers in Psychology 16:1568868 — **[O]**, read in full

"Longer or shorter? A large-scale randomized field experiment on the impact of free trial duration on sustainable user conversion in the Freemium model." [7]

This is the closest published experiment to a trial that falls back to a free tier.

- **Design:** a global image-editing SaaS product with a freemium model; 680,588 new users in about 190 countries, 2023–2024, followed for two years. Control: 3-day trial (479,317 users). Treatment: 7-day trial (201,271 users).
- **Not cardless:** "By submitting their credit card information, users could activate a 3-day trial, which would automatically transition into a paid subscription unless manually canceled." After the trial, non-payers keep the free tier.

| Outcome | 3-day | 7-day | Relative change |
|---|---|---|---|
| Free-trial adoption | 0.856% | 0.951% | +11.098% (p < 0.01) |
| Immediate conversion (at trial end) | 0.224% | 0.241% | +7.342% (not significant) |
| Delayed conversion (later, from free tier) | 0.144% | 0.205% | +42.36% (p < 0.01) |
| Total conversion over two years | 0.368% | 0.445% | +20.92% |

- The longer trial also raised cumulative spending, repeat subscriptions and annual subscriptions (all p < 0.01).
- **Heterogeneity relevant to Turkey:** the benefit of the longer trial was "substantially diminished" in countries with lower GDP rank; the authors recommend to "shorten trial periods or restrict trial content in economically disadvantaged areas". It was stronger in individualist cultures and negative in strongly long-term-oriented cultures. Country-level results for Turkey are not reported.
- Task-oriented features gained from longer trials; "creative, exploratory" features showed demand saturation.
- Authors' stated limits: utility SaaS only, short trials only, no individual demographics. The published correction concerns an author affiliation only.

Why it matters here: it shows that with a free fallback, a longer trial can pay off through **later** conversions rather than at trial end. Why it is not decisive: it compares 3 vs 7 days, not 7 vs 14, and the trial required a card.

### 2.3 Related academic work — all **[S]**

- **Miller, Sahni & Strulov-Shlain**, "Sophisticated Consumers with Inertia" (newspaper field experiment, auto-renewal vs auto-cancel offers) [31]. Versions differ: an earlier version reports auto-renewal offers cut subscriptions by 24% and subscribers by 10% over two years; a later version reports a 35% drop in take-up and 23% fewer total subscribers over 20 months. Auto-renewal and auto-cancel were revenue-equivalent after one year. Relevance: opt-out trials raise short-term conversion through inertia but deter people from starting; a cardless trial trades the first for the second.
- **Nguyen (2025)**, arXiv 2507.06422, theory [32]: with auto-renewal, longer trials earn more from customers who forget to cancel; this mechanism does not exist in a cardless trial.
- **Sunada (2018)**, structural model [33]: a more generous trial speeds learning but substitutes for the paid product; the right length is product-specific.

### 2.4 Company write-ups — all **[S]**, weaker than the experiments

- **RevenueCat blog, D. Tideman, 19 Mar 2026** [12]: describes an A/B test of 7 vs 14 days in which the 14-day trial produced slightly more trial starts but fewer conversions, and the team returned to 7 days. No numbers, app not named. The same post argues trial length should follow activation time, "not pricing norms". One anecdote plus opinion.
- **Duolingo** [34], [10]: Sub Club episode with Anmol Tiwari and the 2026 RevenueCat report say cutting the trial from 14 to 7 days "doubled Duolingo's experimentation velocity". A conversion gain is claimed only by an aggregator and is unconfirmed. **Conflicting observation [O]:** Duolingo's US App Store description on 18 Nov 2026 still reads "try Super Duolingo for 14 days free" [9].
- **Phiture** [42]: framework tying trial length to "natural usage habits". Opinion; no experiment results found.
- **Headspace, Calm, Noom, Strava, Blinkist (trial length), kids apps:** no published trial-length experiment found.
- Secondary claims attributed to Superwall (5.2% for 7-day vs 4.0% for 14-day) and to ChartMogul (median conversion 24% / 19% / 14% for 7 / 14 / 30-day B2B trials) and Recurly 2022 (40.4% for trials ≤7 days vs 30.6% for >61 days, 803 sites) could not be traced to a primary page. They are observational and confounded by product complexity. Treat as unverified.

---

## 3. Cardless trials and reverse trials

All **[S]**. Almost entirely B2B SaaS.

### 3.1 Opt-in (no card) vs opt-out (card required)

| Source | No card | Card required | Notes |
|---|---|---|---|
| First Page Sage (86 SaaS clients, 71% B2B / 29% B2C, Q1 2022–Q3 2025) [35] | 18.2% trial-to-paid | 48.8% | Visitor-to-trial: 8.5% vs 2.5%. Freemium-to-paid 2.6% |
| ChartMogul SaaS Conversion Report [36] | "good" 4–6%, "great" 10–15% | 30% | Median free-to-paid across products 8%; card-required "more than 5x" |
| Lenny's Newsletter / K. Poyar (1,000+ products) [37] | free trial: good 8–12%, great 15–25% | — | Paid within 6 months |
| OpenView 2022 benchmarks [38] | freemium 5%, free trial 17% (medians) | — | Secondary summary |

Consistent direction: card-required trials convert roughly 2.5–5 times as many **trial users**, but far fewer people start them. No source gives a reliable consumer-mobile figure for cardless trials. The nearest mobile reference is RevenueCat's freemium median of 2.1% download-to-paid by Day 35 [10].

### 3.2 Reverse trials

- **Kyle Poyar, "Your guide to reverse trials"** [39] (opinion with some data): a reverse trial only works "when there is a compelling reason to convert later on". Free trials convert "often 2-3x" freemium. Median time-to-purchase "might be 14 days in a free trial company compared to 60 or 90 days for a freemium one". A 2024 follow-up reports Databox's reverse trial improved activation by 6 percentage points.
- **Elena Verna** [40] (practitioner estimate, not a dataset): reverse trials raise freemium-to-paid conversion by "10–40%". Examples: Airtable (14-day team trial with clear messaging about the auto-downgrade), Calendly (14 days), Asana and Toggl (30 days), Notion.
- **Length:** the SaaS convention is 14 days. No source gives data on the right length for a reverse trial. Guidance is uniformly "match it to time-to-value".
- **Consumer mobile examples:** Adapty's glossary names Strava and Ladder as having used reverse trials; a paywall-experiment list describes Ladder's as a 7-day full unlock with no purchase [41]. No results published.

### 3.3 Time-to-value

Every practitioner source says the same thing (opinion, not measured): trial length should cover the time a typical user needs to reach the product's value moment. None quantifies it. The two experiments add nuance: longer trials help through learning (Zhang & Duan) but hurt when users go inactive for long stretches (Yoganarasimhan et al.).

---

## 4. Trial-end reminders and transparency

### 4.1 Evidence on reminders — **[S]**

- **Blinkist** [43], [44], [45]: a paywall that shows a timeline of the 7-day trial and promises a reminder on Day 5 (two days before the charge). Reported results: trial sign-ups +23%, customer complaints −55%, push-notification opt-in from 6% to 74%, conversion to paid +4% (Purchasely's figure). Before the change, 33% of cancellations happened on Day 0. One app, secondary write-ups, card-required trial.
- **RevenueCat blog** on the same case: trial start rate, engagement and trial conversion all rose after reminders were introduced [67].
- **Duolingo**: the 2026 RevenueCat report mentions a test letting users choose the day of their expiry reminder; results not in the snippets [10].
- **Reminder timing:** no study comparing reminder timings (for example 2 vs 3 days before) was found. The team's "3 days before" is in line with practice but is not backed by a timing experiment.

Note the mechanism: in the Blinkist case the reminder works by removing the fear of being charged. A cardless trial has no charge to fear, so the transferable part is transparency and trust, not the size of the effect.

### 4.2 What Apple sends

- **[O]** Apple Media Services Terms: "Certain Subscriptions may offer a free trial prior to charging your payment method"; to avoid a charge, "cancel the Subscription at least twenty-four (24) hours before the free trial ends". The terms do **not** promise a reminder before a trial ends or before renewal. They state "You will be notified if the price of a Subscription increases" [4].
- **[O]** Apple's subscriptions page: for price increases "Apple automatically provides push notifications, email, and in-app messaging". Nothing about trial-end reminders [2].
- **[S]** No official Apple page was found that promises a pre-trial-end reminder for any trial length. Apple Community answers say none is sent; MacRumors (Nov 2026) reports Apple emails customers when a trial is activated [68]. support.apple.com could not be opened, so this remains "no evidence of a reminder", not proof of absence.

### 4.3 What Google sends

- **[S]** Android Developers Blog, April 2020: "We now email users a reminder before their free trial or intro price ends" and remind subscribers on 3-month, 6-month or annual plans before renewal [46].
- **[S]** Google Play Help: if you accept a trial offer, "you'll get an email when your trial is about to end" [47]. No lead time and no minimum trial length stated in the snippets.
- **[O]** Android developer docs: "For free trials, Google Play verifies that the user has a valid payment method before starting the free trial"; "If a user cancels a subscription at any time during the free trial, the subscription remains active until the end of the trial, and they aren't charged". In South Korea, users must consent to the price step-up after a free trial and Play notifies them [5], [6].

Neither store's reminders apply to an in-app cardless trial: the stores do not know it exists. The app must send its own.

### 4.4 Rules elsewhere that set reminder timing — **[S]**, context only

- Visa (effective 18 April 2020): for card-billed trials longer than 7 days, an electronic reminder at least 7 days before the first charge; for shorter trials the details go in the initial confirmation [49]. Not applicable to App Store billing or to a cardless trial.
- UK DMCC Act: reminder required before a free or discounted trial ends; draft guidance applies to contracts from 1 January 2027 [50].

---

## 5. Store mechanics that could constrain the choice

### 5.1 App Store — **[O]**

- **Free-trial durations for introductory offers:** "3 Days. 1 or 2 Weeks. 1, 2, 3, or 6 Months. 1 Year." for every subscription duration [3]. **Both 7 and 14 days are available**; 10 days is not.
- **Eligibility:** "each person is only eligible to redeem one introductory offer per subscription group" [3]. A user who had a store trial cannot get a second one.
- **Disclosure:** "In the purchase flow for a free trial, clearly indicate how long the free trial lasts and the price billed once the free trial is over." The billed amount "must be the most prominent pricing element" [2].
- **Guideline 3.1.2(a):** subscription period at least seven days; apps "may offer a free trial period to customers by providing the relevant information set forth in App Store Connect"; apps that "trick users into purchasing a subscription under false pretenses or engage in bait-and-switch and scam practices" are removed [1].
- **Guideline 3.1.1** (non-subscription apps): a time-based trial via a Price Tier 0 item named "XX-day Trial"; "Prior to the start of the trial, your app must clearly identify its duration, the content or services that will no longer be accessible when the trial ends, and any downstream charges" [1]. This is written for non-subscription apps, but its disclosure list (duration, what is lost, later price) is a sensible checklist for an in-app cardless trial.
- The guideline text opened does not explicitly address a subscription app granting timed premium access outside StoreKit. That is established practice, not a quoted rule; flag for review rather than assume.

### 5.2 Google Play

- **[S]** Free trials "between three days and three years" [48].
- **[O]** Payment method verified before the trial starts; "Allow one free trial per app" setting restricts repeat trials [5].

### 5.3 Consequence

If the team later moves to a store introductory offer, 7 and 14 days are both supported on both stores. The change would switch the trial from opt-in to opt-out, which is a much larger change than the length (see 3.1 and section 6).

---

## 6. Turkey

### 6.1 Rules on "free trial" claims and post-trial subscriptions — all **[S]**, from news and law-firm summaries; official texts not opened

- **Advertising Board (Reklam Kurulu) on trials that need a card.** The Ministry of Trade's announcement on subscription "design traps" is reported to state that requiring payment-method details in order to offer a free trial was assessed as a misleading commercial practice [53]. Law-firm reviews of 2025 decisions say the Board treats mandatory payment details at the start of a free-trial flow as a dark pattern [56], [57].
- **YouTube Premium decision, 15 May 2025 meeting** [51], [52]: Google fined TRY 863,580 and the campaigns stopped. Reported reasoning: the word "deneme" (trial) leads the average consumer to expect the subscription to end by itself with no action; automatic charging at the end defeats that expectation. A pre-selected plan was also criticised. The process began with a stop order in September 2024.
- **September 2024 (349th meeting, 10 Sep 2024)** [55]: 144 files, 118 violations, TRY 22,414,000 in fines; decisions on subscription services including Spotify (2024/5159) and YouTube Premium (2024/5161); advertising stopped for Amazon Prime, MUBI, Storytel, Disney+, BluTV and Netflix subscriptions.
- **Legal basis:** an example added to the annex of the Regulation on Commercial Advertising and Unfair Commercial Practices on 1 February 2022 covers interface designs that weaken the consumer's decision-making. The term "karanlık ticari tasarım" is not in the regulation but is used in Board decisions [57].
- **2026 amendment** to the same regulation: published 1 July 2026 (Official Gazette No. 33297), in force 1 August 2026. Covers influencer advertising, targeted advertising (barred for children), AI-generated content. One consultancy says subscription cancellation was "not addressed" [59].
- **Subscription Contracts Regulation** [60], law-firm summaries: consumers may terminate open-ended contracts at any time; the provider must act within 7 days; unused prepaid amounts refunded within 15 days; fixed-term subscriptions may be extended only with the consumer's request or consent before the term ends.
- **Pending:** October 2026 press reports that the Ministry is preparing to update subscription-contract legislation; 1,459 consumer applications on digital subscriptions in 2025–2026. No draft text published [61].
- **Distance Contracts Regulation, art. 15:** withdrawal-right exception for services performed instantly in electronic form, conditional on prior information and consent [62].
- **Enforcement scale:** TRY 125,281,151 in fines across 661 files in the first five months of 2025 [58]. ICPEN sweep (29 Jan–2 Feb 2024): at least one dark pattern in 30.6% of subscription sites and apps reviewed [54].
- **No Turkish rule was found that requires a reminder before a trial ends**, and none that sets a minimum or maximum trial length.

What this means for the choice: the Turkish enforcement record favours exactly the current design (no card, no automatic charge, falls back to free). It is neutral between 7 and 14 days. It does raise the cost of ever moving to a card-on-file store trial advertised as "ücretsiz deneme". How these rules apply to App Store billing, where Apple is the seller of record, is a question for counsel.

### 6.2 Data on Turkish users' subscription behaviour

**Nothing reliable was found on trial conversion in Turkey.** No country cut for Turkey appeared in RevenueCat, Adapty, Sensor Tower or data.ai material reachable by search, and no local press figure on trial conversion.

Indirect indicators only, all **[S]** except the last:

- RevenueCat MEA region (includes Turkey): monthly plans convert best at 5–9 days, 38.3% vs 27.4% at 17–32 days [11], [16]. Regional aggregate dominated by other countries; card-on-file trials.
- Adapty pricing: Turkey at 0.7 on its 2026 pricing index; weekly Lifestyle pricing 0.5x the US; Health & Fitness annual prices in Germany 4.4x Turkey's. Turkey listed among the fastest-growing app markets [22], [64].
- Sensor Tower State of Mobile 2026, via Turkish press: Turkish users spent $1.35 billion and 107 billion hours in apps in 2025 [63]. No subscription split.
- **[O]** Zhang & Duan: the gain from a longer trial shrinks as country GDP rank falls [7]. A general pattern, not a Turkey estimate.

---

## 7. Parenting, family and kids apps

### 7.1 What comparable apps offer

**[O]** from US App Store descriptions on 18 Nov 2026 [9]:

- Brili Routines (children's routines): "Try the fully-featured Brili app free for 10 days".
- FamilyWall (family organizer): "Free 30 day trial".
- YNAB: "free 30-day trial".
- Duolingo: "try Super Duolingo for 14 days free".
- Greg: "7 day trial! We'll be sure to ping you before the Trial ends".

**[S]** from price-comparison sites, which disagree with each other [65]: Joon 7 days; Lingokids 7 days; Bark 7 days; Aura 14 days; ABCmouse 30 days; HOMER 30 days; Qustodio 3 days (another site says 30). Most of these are store trials with a card.

There is no category norm: family and kids apps range from 3 to 30 days. RevenueCat reports half of Education-category trials (50.3%) at 5–9 days [10]. Adapty reports that Education users decide slowly: only 71.3% of trial starts on Day 0 and 23.5% after day 31 [22].

### 7.2 How long a family needs to see value

**No study or company statement was found** that measures time-to-value, onboarding completion or trial behaviour for a routine, chore or behaviour app. One blog cites a "2023 Boston Children's Hospital study" on gamified chore systems; it could not be located and is not used.

### 7.3 Habit formation — do not overclaim

**[O]** Singh, Murphy, Maher & Smith (2024), systematic review and meta-analysis, 20 studies, 2,601 participants [8]:

- Lally et al. (the study usually cited as 2009 or 2010, European Journal of Social Psychology), as reported by the review: "the median time to reach 95% automaticity was 66 days (range: 18 to 254 days)". The original paper was not opened.
- Across the four studies reporting time: medians 59–66 days, means 106–154 days, individual range 4–335 days.
- Most included studies had a high risk of bias (11 of 20). All concern adults' own health behaviours (exercise, diet, water, flossing).

What can and cannot be said: neither 7 nor 14 days is long enough for a routine to become habitual by these measures, and none of this research is about children's routines managed by a parent. A trial can show early wins and a working system, not a formed habit. The review notes that early repetitions give the largest gains in automaticity, which is a reason to get families active in the first days whatever the length.

### 7.4 Weekly cycles

**No direct evidence found.** One 2026 arXiv study of family health tracking is reported to find logging "fell sharply on weekends", with families treating weekends as a separate routine (**[S]**, adjacent domain) [66].

What follows is reasoning from the product's own design, not evidence:

- A daily-routine product for school-age children has weekday and weekend modes, and its report is weekly. Seeing one complete cycle (five school days, one weekend, one weekly summary) takes at least 7 days from the day routines are actually running.
- The trial clock starts at sign-up, but value needs several steps first: the parent sets up routines, the child's device gets the game, the child completes tasks, the parent approves.
- With a reminder 3 days before the end, a 7-day trial sends that reminder on day 4. A 14-day trial sends it on day 11.

---

## What this implies for a 7 vs 14 day cardless trial

### Arguments for 7 days

| Argument | Evidence | Strength |
|---|---|---|
| The only randomized 7-vs-14 comparison found 7 days at least as good: 15.36% vs 14.96% subscribed | Yoganarasimhan et al. 2023 [S] | Strong design, weak transfer: one B2B/prosumer SaaS firm, effect 0.4 points, measured after trial start |
| Long idle stretches inside a trial reduce conversion | Same paper, mechanism analysis [S] | Moderate. Applies to 14 days only if families go quiet |
| In the region that includes Turkey, monthly plans convert best at 5–9 days (38.3% vs 27.4% at 17–32 days) | RevenueCat Sept 2026 [S] | Weak: observational, card-on-file, regional aggregate, compares with 17–32 not 10–16 days |
| Longer trials help less in lower-GDP markets | Zhang & Duan 2025 [O] | Moderate design, indirect: 3 vs 7 days, card required, no Turkey result |
| Faster experiment cycles | Duolingo account [S]; arithmetic | Anecdote, but the logic holds: results arrive a week sooner |
| A team that tested 14 days went back to 7 | RevenueCat blog anecdote [S] | Weak: no numbers, one app |
| 5–9 days is the most common length in Education and Health & Fitness | RevenueCat 2025/2026 [S] | Describes practice, not effectiveness |

### Arguments for 14 days

| Argument | Evidence | Strength |
|---|---|---|
| With a free fallback, a longer trial raised later conversions (+42%) and total two-year conversion (+21%) without hurting conversion at trial end; also more trial starts (+11%) | Zhang & Duan 2025 [O] | Best available evidence for the freemium mechanism, but 3 vs 7 days and card required |
| Annual plans convert better after 10–16 days than 5–9 days (43% vs 33%); monthly plans are equal (46.6% vs 45.9%) | RevenueCat Sept 2026 [S] | Weak: observational, card-on-file, selection acknowledged by the source |
| One full school week, weekend and weekly report fit inside the trial with room for a slow start; the 3-day reminder lands on day 11, not day 4 | Product reasoning; no data | Logical, untested |
| Trial length should match time-to-value; reverse-trial convention is 14 days (Airtable, Calendly) | Poyar, Verna, RevenueCat blog [S] | Opinion and convention |
| In a cardless trial the main cost of extra days is delay, not lost revenue: nobody is charged by inertia either way, and non-payers stay on the free plan and can convert later | Follows from the design; consistent with Miller et al. and Poyar [S] | Reasoning; no direct test |
| Same length as the sister professional product; one message across products | Internal consistency | Practical, not evidential |
| Education-type users decide slowly (23.5% of trial starts after day 31) | Adapty 2026 [S] | Weak, different metric |

### What the evidence does not tell us

- No published test of 7 vs 14 days on a **cardless** consumer trial, with or without a free fallback.
- No data on Turkish users' trial behaviour.
- No data on how long families take to activate a routine or chore product.
- No experiment on reminder timing.
- Whether the snippet-only figures are exactly right: none of the RevenueCat, Adapty, Superwall, ChartMogul, First Page Sage, Yoganarasimhan or Turkish legal sources could be opened.

### Overall read

1. **The measured difference between 7 and 14 days is small wherever it has been measured.** The one randomized test shows 0.4 points; RevenueCat's monthly-plan medians differ by 0.7 points. Nothing suggests either choice is a serious mistake.
2. **The evidence is split by mechanism, not by quality.** Urgency and avoiding idle time favour 7 days. Learning, and later conversion from a free tier, favour longer. This product's design (no card, free fallback, weekly rhythm, two devices to set up) sits closer to the conditions where longer trials helped, but the supporting experiment compared 3 with 7 days, not 7 with 14.
3. **For this product the deciding factor is time-to-value, which only the team's own data can show.** If most families who activate do so within a day or two of sign-up, 7 days covers a full week and the published evidence leans slightly to 7. If activation commonly takes several days, a 7-day trial that reminds on day 4 ends before a first full week, and 14 days is the safer choice.
4. **Larger levers than length, according to the same sources:** what happens on day 0–1 (Adapty: about 90% of trial starts on day 0; RevenueCat: most cancellations on day 0–1), and being explicit about when the trial ends and what happens next (Blinkist).
5. **How to settle it:** this is cheap to test because nobody is charged. Randomize 7 vs 14 days and compare paid conversion at a fixed day counted from sign-up (for example day 30 or 45), not at trial end, since in a cardless trial with a free plan much of the conversion comes after the trial. Track activation day and idle days in both arms.

---

## Sources

**[O] opened and read in this session · [S] snippet only (search-tool summary; page could not be opened)**

1. [O] Apple, App Store Review Guidelines (3.1.1, 3.1.2). https://developer.apple.com/app-store/review/guidelines/
2. [O] Apple, Auto-renewable subscriptions. https://developer.apple.com/app-store/subscriptions/
3. [O] Apple, App Store Connect Help, Set up introductory offers for auto-renewable subscriptions. https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions/
4. [O] Apple Media Services Terms and Conditions (US). https://www.apple.com/legal/internet-services/itunes/us/terms.html
5. [O] Android Developers, About subscriptions (Play Billing). https://developer.android.com/google/play/billing/subscriptions
6. [O] Android Developers, Subscription lifecycle. https://developer.android.com/google/play/billing/lifecycle/subscriptions
7. [O] Zhang L., Duan J. (2025). Longer or shorter? A large-scale randomized field experiment on the impact of free trial duration on sustainable user conversion in the Freemium model. Frontiers in Psychology 16:1568868. doi:10.3389/fpsyg.2025.1568868. https://pmc.ncbi.nlm.nih.gov/articles/PMC12217587/ (full text read via Europe PMC; correction PMC12642629 also read)
8. [O] Singh B., Murphy A., Maher C., Smith A.E. (2024). Time to Form a Habit: A Systematic Review and Meta-Analysis of Health Behaviour Habit Formation and Its Determinants. Healthcare 12(23):2488. doi:10.3390/healthcare12232488. https://pmc.ncbi.nlm.nih.gov/articles/PMC11641623/ (full text read via Europe PMC)
9. [O] App Store listings, US storefront, descriptions read via Apple's search API on 18 Nov 2026: Duolingo https://apps.apple.com/us/app/duolingo-learn-languages/id570060128 · YNAB https://apps.apple.com/us/app/ynab/id1010865877 · Brili Routines https://apps.apple.com/us/app/brili-routines-habit-tracker/id1516036620 · FamilyWall https://apps.apple.com/us/app/familywall-family-organizer/id496889629 · Greg https://apps.apple.com/us/app/greg-plant-identifier-care/id1512912236
10. [S] RevenueCat, State of Subscription Apps 2026. https://www.revenuecat.com/state-of-subscription-apps-2026/
11. [S] RevenueCat blog, How long should your free trial be? Data from 17,000+ apps (28 Sep 2026). https://www.revenuecat.com/blog/growth/free-trial-length
12. [S] RevenueCat blog (D. Tideman), The right trial length isn't 7 days (19 Mar 2026). https://www.revenuecat.com/blog/growth/7-day-trial-subscription-app
13. [S] RevenueCat blog, The State of Subscription Apps in 10 minutes: benchmarks for 2026. https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026
14. [S] RevenueCat, State of Subscription Apps 2025. https://www.revenuecat.com/state-of-subscription-apps-2025
15. [S] RevenueCat, State of Subscription Apps 2024. https://www.revenuecat.com/state-of-subscription-apps-2024
16. [S] SaaStr, What 17,000 Subscription Apps Tell Us About Free Trial Length. https://www.saastr.com/what-17000-subscription-apps-tell-us-about-free-trial-length-annual-plans-convert-86-better-with-30-day-trials-monthly-tops-out-at-two-weeks-and-ai-apps-hit-a-wall-at-16-days/
17. [S] SaaStr, The Top 10 Learnings From RevenueCat's State of Subscription Apps. https://www.saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps-how-115000-mobile-apps-deliver-16b-in-revenue-whats-working-whats-quietly-killing-growth/
18. [S] Business of Apps, App Subscription Trial Benchmarks (2026). https://www.businessofapps.com/data/app-subscription-trial-benchmarks/
19. [S] Singular, Subscription apps: 17 things I learned from RevenueCat's big new report. https://www.singular.net/blog/subscription-apps/
20. [S] RocketShip HQ, RevenueCat State of Subscription Apps summary. https://www.rocketshiphq.com/revenuecat-state-of-subscription-apps-2025-summary/
21. [S] Adapty, State of in-app subscriptions 2025 in 10 minutes. https://adapty.io/blog/state-of-in-app-subscriptions-2025-in-10-minutes/
22. [S] Adapty, State of in-app subscriptions 2026: key findings. https://adapty.io/blog/mobile-app-monetization-2026/ · report https://adapty.io/state-of-in-app-subscriptions-report/
23. [S] Adapty, The trial vs. direct question: what $3B in revenue says. https://adapty.io/blog/free-trial-vs-direct-purchase-subscription-apps/
24. [S] Adapty, State of Paywalls 2026. https://adapty.io/state-of-paywalls/
25. [S] Adapty, Trial conversion rates for in-app subscriptions. https://adapty.io/blog/trial-conversion-rates-for-in-app-subscriptions/
26. [S] Adapty, In-app subscription benchmarks for Education apps. https://adapty.io/blog/education-app-subscription-benchmarks/ · Health & Fitness https://adapty.io/blog/health-fitness-app-subscription-benchmarks/
27. [S] Superwall, State of App Monetization 2026. https://superwall.com/blog/state-of-app-monetization-2026
28. [S] The Paywall Index, 3-Day vs. 7-Day Trials: What 10,000+ Apps Actually Show. https://thepaywallindex.substack.com/p/do-3-day-or-7-day-trials-perform
29. [S] Yoganarasimhan H., Barzegary E., Pani A. (2023). Design and Evaluation of Optimal Free Trials. Management Science 69(6):3220–3240. https://doi.org/10.1287/mnsc.2022.4507 · author PDF https://faculty.washington.edu/hemay/Free_Trial.pdf · working paper https://arxiv.org/abs/2006.13420
30. [S] Science Says, The optimal free trial length. https://app.sciencesays.com/p/optimal-free-trial-length
31. [S] Miller K.M., Sahni N.S., Strulov-Shlain A., Sophisticated Consumers with Inertia: Long-Term Implications from a Large-Scale Field Experiment. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4065098
32. [S] Nguyen F. (2025), Trial Length, Pricing, and Rationally Inattentive Customers. https://arxiv.org/abs/2507.06422
33. [S] Sunada T. (2018), Customer Learning and Revenue-Maximizing Trial Design. https://marketing.wharton.upenn.edu/wp-content/uploads/2018/10/10.17.2018-PAPER-Sunada-Takeak-JMP20181002.pdf
34. [S] Sub Club podcast, How Clarity and Personalization Help Drive Duolingo's Growth (Anmol Tiwari). https://subclub.com/episode/how-clarity-and-personalization-help-drive-duolingos-growth-anmol-tiwari-duolingo
35. [S] First Page Sage, SaaS Free Trial Conversion Rate Benchmarks. https://firstpagesage.com/seo-blog/saas-free-trial-conversion-rate-benchmarks/
36. [S] ChartMogul, The SaaS Conversion Report. https://chartmogul.com/reports/saas-conversion-report/ · second edition https://chartmogul.com/reports/saas-conversion-report-2/
37. [S] Lenny's Newsletter, What is a good free-to-paid conversion rate. https://www.lennysnewsletter.com/p/what-is-a-good-free-to-paid-conversion
38. [S] OpenView, Third Annual Product Benchmarks Report, press release (June 2022). https://www.prnewswire.com/news-releases/openviews-third-annual-product-benchmarks-report-reveals-plg-companies-2x-more-likely-to-grow-quickly-301562090.html
39. [S] Kyle Poyar, Your guide to reverse trials (Growth Unhinged). https://www.growthunhinged.com/p/your-guide-to-reverse-trials
40. [S] Elena Verna, Trial or Freemium? Get the Best of Both with a Reverse Trial (Amplitude). https://amplitude.com/blog/reverse-trial · Reverse Trials: Examples https://www.elenaverna.com/p/reverse-trials-examples
41. [S] Adapty glossary, Free trial. https://adapty.io/glossary/free-trial/ · paywall experiments list https://www.roastmyapp.co/paywall-experiments
42. [S] Phiture, How to Optimize Your Free Trial Length. https://phiture.com/mobilegrowthstack/the-subscription-stack-how-to-optimize-trial-length/
43. [S] Growth.Design, How Blinkist Increased Trial Conversions by 23% (Ethically). https://growth.design/case-studies/trial-paywall-challenge
44. [S] Purchasely, Blinkist paywall transformation. https://www.purchasely.com/blog/blinkist-paywall-transformation-revolutionizes-app-user-engagement
45. [S] Subscription League podcast, Blinkist: Using transparency to increase your conversion rate (Eveline Moczko). https://subscriptionleague.com/episode/blinkist-using-transparency-to-increase-your-conversion-rate-with-eveline-moczko
46. [S] Android Developers Blog, Building user trust through more transparent subscriptions (April 2020). https://android-developers.googleblog.com/2020/04/building-user-trust-through-more.html
47. [S] Google Play Help, Subscribe to services or content. https://support.google.com/googleplay/answer/2476088
48. [S] Play Console Help, Understanding subscriptions. https://support.google.com/googleplay/android-developer/answer/12154973
49. [S] Stripe Support, 2020 Visa Trial Subscription Requirement Changes FAQ. https://support.stripe.com/questions/2020-visa-trial-subscription-requirement-changes-faq
50. [S] UK government, Draft Guidance on Consumer Subscription Contracts. https://assets.publishing.service.gov.uk/media/6acf97da2de3184ccf8b814e/subscription-contracts-rules-guidance.pdf · Taylor Wessing summary https://www.taylorwessing.com/en/insights-and-events/insights/2024/12/aq-subscription-contracts-under-the-dmcc-act
51. [S] Turkish Law Blog, YouTube Premium'un "Deneme Süresi"ne Reklam Kurulu Engeli. https://turkishlawblog.com/insights/detail/youtube-premiumun-deneme-suresine-reklam-kurulu-engeli-googlea-ceza
52. [S] Marketing Türkiye, YouTube Premium'un "ücretsiz deneme" kampanyasına Reklam Kurulu'ndan ceza. https://www.marketingturkiye.com.tr/haberler/youtube-premiumun-ucretsiz-deneme-kampanyasina-reklam-kurulundan-ceza-karari-cikti/
53. [S] T.C. Ticaret Bakanlığı, Reklam Kurulu abonelik hizmetlerine ilişkin tasarım tuzaklarına dikkat çekiyor. https://ticaret.gov.tr/haberler/ticaret-bakanligi-reklam-kurulu-abonelik-hizmetlerine-iliskin-tasarim-tuzaklarina-dikkat-cekiyor
54. [S] T.C. Ticaret Bakanlığı, ICPEN taraması duyurusu. https://tuketici.ticaret.gov.tr/haberler/icpen-tarafindan-yapilan-taramada-abonelik-hizmetlerine-iliskin-bircok-internet-sitesinde-ve-mobil-uygulamada-karanlik-ticari-tasarim-kullanildigi-tespit-edildi
55. [S] NSN Law, Reklam Kurulu abonelik hizmetlerine ilişkin karanlık ticari tasarımları inceliyor. https://nsn-law.com/tr/bulten/reklam-kurulu-abonelik-hizmetlerine-iliskin-karanlk-ticari-tasarmlar-inceliyor
56. [S] Gün + Partners, Reklam Kurulu kararlarında 2025 yılında öne çıkan eğilimler. https://gun.av.tr/tr/goruslerimiz/guncel-yazilar/reklam-kurulu-kararlarinda-2025-yilinda-one-cikan-egilimler
57. [S] Mondaq, Abonelik sözleşmelerindeki gizli tuzaklar: karanlık ticari tasarımlar. https://www.mondaq.com/turkey/broadcasting-film-tv-radio/1610944/abonelik-s%C3%B6zle%C5%9Fmelerindeki-gizli-tuzaklar-karanl%C4%B1k-ticari-tasar%C4%B1mlar
58. [S] Forbes Türkiye, Reklam Kurulu'ndan beş ayda 125 milyon liralık ceza. https://www.forbes.com.tr/haberler/reklam-kurulu-ndan-bes-ayda-125-milyon-liralik-ceza
59. [S] T.C. Ticaret Bakanlığı, 2026 yönetmelik değişikliği duyurusu. https://ticaret.gov.tr/haberler/aldaticici-reklam-ve-haksiz-ticari-uygulamalarla-mucadelede-yeni-donem-basliyor · Erdem & Erdem https://www.erdem-erdem.av.tr/bilgi-bankasi/ticari-reklam-ve-haksiz-ticari-uygulamalar-yonetmeliginde-kapsamli-degisiklikler-yapildi · Switas https://www.switas.com/tr/articles/what-turkey-s-new-advertising-regulation-breaks-in-your-e-commerce-interface-at-august-2026
60. [S] Abonelik Sözleşmeleri Yönetmeliği, consolidated text (Lexpera). https://www.lexpera.com.tr/mevzuat/yonetmelikler/abonelik-sozlesmeleri-yonetmeligi-1 · commentary https://halilbakirci.av.tr/belirli-sureli-abonelik-otomatik-yenileme-tuketici-onayi-6502-52-3/
61. [S] Dünya, Dijital aboneliklerde onaysız yenileme mercek altında. https://www.dunya.com/ekonomi/dijital-aboneliklerde-onaysiz-yenileme-mercek-altinda-bakanlik-inceleme-baslatti-haberi-844536 · https://www.borsaningundemi.com/haber/dijital-aboneliklere-yeni-duzenleme-geliyor-1912014
62. [S] Commentary on Distance Contracts Regulation art. 15. https://hukukcularevi.com/mesafeli-sozlesme-cayma-hakki-istisnalari/ · https://sahinhukuk.org/2025/02/19/dijital-abonelik-hizmetlerinden-cayma-hakki/
63. [S] Sensor Tower State of Mobile 2026, via Yeniçağ. https://www.yenicaggazetesi.com/turkiyede-yapay-zeka-yukselisi-turkiye-mobil-uygulamalara-107-milyar-saat-ve-1-milyar-350-milyon-dolar-harcadi-998702h.htm
64. [S] Adapty, Which app markets are growing fastest in 2026? https://adapty.io/blog/fastest-growing-app-markets-2026/
65. [S] Kids' app price comparisons. https://peabody.kids/resources/software/prices · https://www.safewise.com/kids-safety/parental-control-apps/
66. [S] Evaluating Glanceable Multi-Device Family Health Tracking with Smartwatches and Home Displays (2026). https://arxiv.org/pdf/2607.01618
67. [S] RevenueCat engineering blog, How to add trial notifications to your subscriptions. https://www.revenuecat.com/blog/engineering/how-to-add-trial-notifications-to-your-subscriptions
68. [S] MacRumors, Apple Store Subscription Sign-Up Controversy Exposed (8 Nov 2026). https://www.macrumors.com/2026/11/08/apple-store-subscription-controversy/
