# Personalized notifications and email: global benchmark and recommended design for Moyo Ebeveyn and Moyo Mercek

Research date: 17 November 2026. Scope: push, in-app and email messages for activation, habit/retention, feature adoption, monetization and win-back; Turkey market; messages go to the parent or the clinician only, never to the child.

## How to read this report

- Numbers in square brackets point to the source list at the end.
- **Verification level.** In this research session only `developer.apple.com` could be opened and read directly. Every other source was read through search-engine extracts of the page (the hosts did not resolve from this session). Each benchmark row is marked:
  - **P** = primary page read directly (Apple only),
  - **S** = primary page (company blog, paper, official docs, regulator), read through search extracts,
  - **2** = secondary write-up (podcast summary, agency case study, law-firm note, press).
- Performance numbers quoted from other companies are **theirs**, measured on their products. They are not predictions for Moyo.
- Sections 3 to 6 are **recommendations** (my proposal, built on the benchmark). They are not facts about what others do.
- Anything marked **needs lawyer** is legally uncertain and must not be treated as settled.

---

## 1. Benchmark

### 1.1 Duolingo in depth

| Topic | What they do | Personalization signal | Limit / stop rule | Source | Level |
|---|---|---|---|---|---|
| Choosing the reminder copy | A bandit algorithm ("Recovering Difference Softmax") picks one practice-reminder template per learner per day from the templates that are eligible for that learner. A template counts as successful only if the learner completes a lesson **within two hours** of the send (not on open). Reported result (theirs): +0.5% daily active users and +2% new-user retention over a strong baseline. They released 200 million reminder records over 35 days as replication data. | Eligibility of each template for that learner ("sleeping" arms); how recently this learner saw the same template ("recovering" arms: a template works better when it has not been seen recently, so repeats are penalized) | One practice reminder per day; the algorithm changes *which* message, not *how many* | [1] [3] | S |
| Avoiding repeated copy | Each notification is compared only with others sent to the same type of learner; repeats of the same notification are spaced out using the same forgetting-curve idea they use for vocabulary | Past exposure of this learner to each template | Recently used template is demoted | [2] | S |
| Timing of the daily reminder | The next reminder is scheduled about **23.5 hours after the learner last engaged** (assumption: free at the same time tomorrow). Duolingo's retention PM says a user's self-chosen reminder time is a poor guide because it does not stay free. The app also has a user setting for practice reminders and reminder time. | The learner's own last session time | One per day | [5] [10] | 2 (podcast with Duolingo PM) / S (help page) |
| "Protect the channel" | One foundational rule for push: protect the channel. The team may freely optimize timing, templates, images, copy, localization, but may **not increase the quantity** of notifications without strong justification and CEO approval. Lesson taken from Groupon, whose aggressive email tests "destroyed their channel". | n/a | Quantity frozen by rule | [4] | S |
| Streak saver | A notification that alerts users who have a streak that they are about to lose it; described as the team's first big win in streak work. Exact send hour is not published (secondary sources describe a late-evening last-chance push). The streak team reports more than 600 experiments. | Has an active streak; has not practised today | Only for users with something to lose | [4] [6] | S / 2 |
| Why streaks matter for messaging | Learners who reach a 7-day streak are 2.4 times more likely to continue the next day than learners without a streak (their number) | Streak length | n/a | [8] | S |
| Stopping reminders | Practice reminders are sent daily for up to **7 days** of inactivity and then switched off; an older account by the CEO mentions 5 days. Final message quoted by users: "These reminders don't seem to be working. We'll stop sending them for now." | Days since last session | Hard stop after about a week | [5] [11] | 2 |
| Win-back | Best window to re-engage a lapsed user is the first 3 to 4 days; most users gone for a week do not return. For users gone weeks or months, a prompt coming from an active friend works better than an app message. On a normal day about 5% of daily users are people returning after 30+ days; a course-launch newsletter lifted that share from 5% to 8% on the day (their numbers). | Days inactive; social graph | Short window, then low-frequency email | [5] [9] | 2 / S |
| Widget | Home-screen widget shows the streak and an owl whose mood gets more worried as the day passes without a lesson; built to prompt action. Duolingo says widget users retain better (no figure published) and half of learners with the widget have a streak of 6+ months (their number). | Streak state today | Passive surface: no interruption at all | [7] | S |
| Opt-in wording | Copy tests on the permission explanation: linking notifications to reaching the learning goal gave +8% opt-in for German-language users, no change for Spanish-language users (their numbers) | Language/market | n/a | [12] | 2 |
| Email cadence | No primary source found. See "Not verified". | | | | |

### 1.2 Other strong programs

| Company | What / to whom | When (trigger, timing) | Channel | Personalization | Limit / anti-annoyance | Source | Level |
|---|---|---|---|---|---|---|---|
| **Calm** (consumer habit) | Daily meditation reminder, surfaced as a prompt to new users | Right after the first completed session, the app asks the user to set a daily reminder time | In-app prompt → push | User-chosen time | Opt-in feature, not default. Before the prompt under 1% found the setting; about 40% of prompted users set a reminder; retention about 3x for those users (vendor-reported, theirs) | [13] | S (vendor case study) |
| **Headspace** (consumer habit) | Push opt-in prompts that differ by lifecycle | Free trialists are asked to opt in **so they can be reminded that the trial is ending**; subscribers get a different prompt on app open (not during a meditation) | In-app message → OS prompt | Lifecycle stage, language/market | Reported +157% push opt-ins in one segment, +118% among German-language trialists (agency-reported, theirs) | [14] | 2 (agency case study) |
| **Blinkist** (consumer subscription) | Trial timeline on the paywall plus a push reminder before the trial ends | Reminder about 2 days before the end of a 7-day trial | Paywall promise → push (and email) | Trial end date | Reported (theirs, via secondary sources): +23% trial starts, −55% complaints, push opt-in from 6% to 74%. An independent copy at another app (Slopes) saw 7.8% lower trial-to-paid among users who opted into the reminder, so the conversion effect is not guaranteed. RevenueCat recommends a reminder "a day or two" before conversion. | [15] [16] | 2 |
| **LinkedIn** (large platform) | "Air Traffic Controller": one system that sees every candidate notification for a member and picks a set | Holds non-urgent items overnight; schedules digests for the morning; predicts the chance a member engages with or disables a notification | Email, push, in-app chosen centrally | Member's past reactions to notifications | Email volume work: 40% less email and complaints cut in half (their numbers, 2015) | [17] [18] | S |
| **Facebook / Instagram** (large platform) | Send fewer notifications, only those predicted to matter | Long-running experiment: fewer notifications first reduced visits, then after about a year usage fully recovered and turned into a gain. Instagram: uplift model trained on randomly dropped notifications decides which sends are incremental; a 2025 ranking layer demotes notifications similar to recently sent ones. | Push | Predicted incremental effect per person; similarity to recent sends | Volume reduced "substantially" with no engagement loss (their statement) | [19] [20] | S |
| **Pinterest** (large platform) | Per-user notification budget | Models weekly activity as a function of that user's notification volume; thresholds differ by how active the user is | Push, email | User activity state | Volume budget per user; automatic threshold tuning | [21] | S |
| **Netflix** (large platform) | Two-level policy: a "slow" policy sets each member's **weekly messaging plan** (intended frequency per channel); a "fast" policy decides at each send opportunity | Weekly plan + per-opportunity decision; a universal "message cost" is added to every send | Push, email, in-app | Predicted incremental value and negative feedback | Frequency decided separately from ranking; biggest gains among infrequent viewers (their statement) | [22] | S (read via mirror) |
| **X (Twitter)** | Personalized push cap | Model picks a daily push cap and a "fatigue" interval per user; finding: the right cap is not the same for everyone, and for light users a simple state-based cap beat full personalization | Push | User activity state | Per-user daily cap | [23] | S |
| **Slack** (B2B) | Message notifications to workers | Mobile push only when the person is inactive on desktop (default: after the desktop is locked or idle); email only when mobile push is not in use | Desktop → mobile push → email | Presence, device, per-channel preferences | Do Not Disturb hours (admin default, user can change): no desktop or mobile notifications in that window | [24] | S |
| **Notion** (B2B) | Mentions, comments, reminders | Push if the notification has not been seen (older help versions: within 5 minutes); email if the app is not open or mobile notifications are off and the item is unseen; no notification if you are viewing the page | In-app inbox → push → email | Presence, read state | Email is suppressed when the item was already read; "always send email" is an explicit opt-in | [25] | S |
| **Linear** (B2B) | Issue updates | Desktop, mobile and Slack in real time; **email digests are delayed** by urgency and only sent if the inbox item is still unread; option to hold low-priority email outside work hours (8:00–18:00 local) until the next day | Inbox first, email as delayed digest | Read state, urgency, work hours | Digest instead of one email per event | [26] | S |
| **ClassDojo** (parents and teachers) | School messages to parents | Parents with the mobile app get push **instead of** email (not both); web-only parents get email. Teachers can set Quiet Hours: no notifications for parent messages in that window, and parents see that the teacher is away. | Push or email, never both | Device/app installed | Channel exclusivity; quiet hours for the professional | [27] | S |
| **Joon** (parents of children with routines) | "Quest completed, ready for review" to the parent | When the child completes a quest; coins are granted only after the parent approves | Push to parent app | Child's task events | A third-party review notes the stream can become a burden for busy families; Joon replaced the review tab with a bulk review flow | [28] | S (App Store text, user manual) / 2 |
| **SimplePractice** (clinicians) | Clinician app: per-type push toggles (upcoming appointments, new secure messages, new appointment requests); **Daily Agenda** email each morning and **Evening Summary** each evening | Morning agenda is skipped when there is nothing to report; new team members have it off by default | Push by category; email as daily digest | Role (owner vs team member), own schedule | Empty digest is not sent; per-category toggles | [29] | S |
| **Jane App** (clinics) | Appointment reminders to patients | Clinic sets method (email, SMS, phone) and hours before the appointment; SMS requires patient opt-in depending on clinic setting | Email / SMS | Appointment time | Patient subscription setting | [30] | S |

No documented primary material was found for Noom, Strava, Spotify, Airbnb, Canva, Greenlight (see "Not verified").

### 1.3 Anti-annoyance mechanics in vendor and platform guidance

| Mechanic | Concrete guidance | Source | Level |
|---|---|---|---|
| Global frequency cap | Braze: caps can be set across all channels, per channel, or both; when rules conflict the most restrictive applies; caps are counted per calendar day in the user's time zone; frequency capping is on by default for new campaigns; in-app messages and Content Cards are not capped; sends that override the cap do not count toward it. OneSignal: per-user push cap over a rolling minute/hour/day/week; applies to push only; a single send can bypass it. Customer.io: limits are counted per person, per channel or shared across channels, windows up to 31 days; **transactional and in-app messages are exempt**. | [31] [33] [34] | S |
| Quiet hours and local time | Braze: quiet hours are applied in each user's local time zone; if the computed best time falls inside quiet hours the message is sent at the nearest edge of the window; users without enough data get a fallback time. | [32] | S |
| Channel fallback | OneSignal: wait for push delivery or click with an expiry, then send the fallback (email or SMS) on another channel. | [33] | S |
| Interruption levels (iOS) | Passive = view at leisure; Active = default; Time Sensitive = directly affects the person and needs immediate attention, about an event happening now or within an hour, breaks through Focus and scheduled summary; Critical needs an entitlement. "Never use the Time Sensitive interruption level to send a marketing notification." Represent urgency accurately. | [36] | P |
| Notification summary | `relevanceScore` (0 to 1) decides which of an app's notifications is featured in the scheduled summary. | [39] | P |
| Duplicates | "Avoid sending multiple notifications for the same thing, even if someone hasn't responded." | [37] | P |
| Sensitive content | "Avoid including sensitive, personal, or confidential information in a notification." | [37] | P |
| Instructions in a push | "Avoid sending a notification that tells people to perform specific tasks within your app"; prefer useful notification actions; avoid an action that merely opens the app. | [37] | P |
| Asking permission | Ask in a context that shows why (example: after the person schedules a first task), not on first launch. Provisional authorization delivers quietly to Notification Center with Keep / Turn Off buttons. | [38] | P |
| Marketing push | Must have explicit permission through an in-app interface that describes what will be sent, and an in-app settings screen to change the choice. | [36] [40] | P |
| Opt-in benchmark | Airship: median iOS opt-in rate about 49–51% in recent years (their data, read via secondary summaries). | [35] | 2 |
| Email | Gmail: senders above 5,000 messages a day must support one-click unsubscribe on marketing and subscribed messages; spam-complaint rate above 0.3% removes mitigation. Resend: "Topics" let a contact unsubscribe from one type of broadcast without leaving all; transactional mail needs your own unsubscribe handling. | [41] [42] | S |

---

## 2. Principles that recur in the best programs

1. **Protect the channel.** Volume is the scarce resource. The best teams freeze quantity and improve timing and copy instead (Duolingo [4]); those who measured long-term effects found that fewer, better notifications won (Facebook [19], LinkedIn [18]).
2. **One arbiter sees everything.** A single system chooses the set of messages a person gets, across teams and channels, instead of each feature sending on its own (LinkedIn ATC [17], Netflix weekly plan [22], Pinterest budget [21]).
3. **Time the message from the person's own behaviour.** "Same time as yesterday's session" beat the time users picked themselves at Duolingo [5]; quiet hours and local time are standard [32].
4. **Judge by the action, not the open, and keep a holdout.** Duolingo counts a lesson within two hours [1]; Instagram and Netflix measure incremental effect against people who did not get the message [20] [22].
5. **Stop when it is not working.** Daily reminders end after about a week of silence, with an honest last message [5] [11]; the win-back window is the first days [5].
6. **Choose the channel by presence and urgency.** In-app first; push only if the person is away; email as a delayed digest or fallback, suppressed once the item is read; never the same item on two channels (Slack [24], Notion [25], Linear [26], ClassDojo [27]).
7. **Ask for permission in context, with a concrete benefit, and keep marketing separate.** Calm asked after the first session [13]; Headspace and Blinkist tied the opt-in to a trial reminder [14] [15]; Apple and the Turkish regulators require a separate, revocable choice for promotional push [36] [40] [47] [49].
8. **Rotate copy; novelty wears off.** A template works better when the person has not seen it recently, so repeats are spaced out [1] [2]; Instagram demotes notifications similar to recent ones [20].

---

## 3. Recommended message matrix: Moyo Ebeveyn

Conventions used in both matrices:

- **Category** decides the consent basis and the cap: **T** transactional/account, **H** human-triggered (a real person did something for this user), **O** the user's own pending tasks or data, **L** lifecycle guidance (onboarding, habit, feature tips), **M** marketing/promotional (only with the separate marketing permission).
- "Usual time" = the hour of the parent's most recent app session on a previous day, minus 30 minutes, clamped to 08:00–21:00 local time; fallback 19:30. (Adapted from Duolingo's 23.5-hour rule [5].)
- Push copy states what happened; it does not give step-by-step instructions (Apple [37]). No child name, no behaviour detail, no therapist topic in the push text (Apple [37]; cross-border and special-category concerns, section 7).
- Success is measured as the target action inside the window, compared with the holdout group (section 6).
- Example copy is in Turkish, "sen" form, no outcome or health claims, no guilt.

| # | Stage | Trigger (event or absence) | Audience condition | Cat. | Channel | Timing rule | Cap | Example copy (TR) | Success = |
|---|---|---|---|---|---|---|---|---|---|
| E1 | Activation | Account created, no routine after 24 h | Signed up, 0 routines | L | In-app card always; push if permission exists; email at 72 h if still none | Usual time on day 2; email day 4 at 10:00 | 1 push + 1 email in total, then stop | "İlk rutini kurmaya hazır mısın? Hazır rutinlerden birini seçip saatini ayarlaman yeterli." | First routine created within 24 h of the message |
| E2 | Activation | First routine saved | Push permission not yet asked | L | In-app permission primer (before the iOS prompt) | Immediately after the first routine is saved (Apple [38], Calm [13]) | Asked once; ask again only from Settings | "Adımlar onayını beklediğinde haber verelim mi? Yalnızca kendi rutinlerinle ilgili bildirim göndeririz. Kampanya bildirimleri ayrı bir izinle açılır." | iOS permission granted |
| E3 | Activation | Routine exists, no step completed by the child in 48 h | Child's game not linked or never opened | L | In-app card; push once | Usual time on day 3 | 1 push, then in-app only | "Rutin hazır. Çocuğunun oyunda görebilmesi için bağlantıyı tamamlaman gerekiyor." | First step completion within 72 h |
| E4 | Habit | Child completed steps that wait for approval (already exists today); evening catch-up if some are still pending | Parent not in the app; for the catch-up: pending > 0, no approval push tapped today, no session today | O | Push, batched per routine | One push when the routine's last step is done, or 30 minutes after the first completed step, whichever comes first; same collapse key so a newer count replaces the older push. Catch-up at 20:00 local, only if no push was sent after 18:00 | Max 2 approval pushes per day, catch-up included | "Sabah rutini tamamlandı: 5 adım onayını bekliyor." · Catch-up: "Bugünden 3 adım onayını bekliyor." | Steps approved within 2 h (catch-up: before midnight) |
| E5 | Habit | End of week | At least 1 completed step this week; parent opted in to the weekly summary | O | In-app card + email (email only if "Haftalık özet" is on) | Sunday 18:00 local | 1 per week | Subject: "Bu haftanın özeti" · Body: "Bu hafta 4 rutinde 21 adım tamamlandı, 18'ini onayladın. Ayrıntılar uygulamada." | Email click or app session within 24 h |
| E6 | Habit (lapse and stop) | No parent session for 2 days while steps are pending; then 7 days without a session | Previously active (at least 3 active days) | L | Push | Usual time on inactive days 2 and 4; on day 7 one last message saying that reminders are stopping (Duolingo pattern [5] [11]) | 2 reminders + 1 stop message; after that all L pushes pause until the parent returns | "Birkaç adım onayını bekliyor. Uygun olduğunda bakabilirsin." · Day 7: "Hatırlatmaları şimdilik durduruyoruz. İstediğin zaman Ayarlar'dan yeniden açabilirsin." | Session within 24 h of a reminder; for the stop message the guardrail is the disable rate |
| E7 | Feature adoption | Therapist assigned a module (the "new module" notification already exists) and it is unopened after 48 h | Therapist connected; no manual reminder from the therapist in the last 48 h | H | Push once; email at day 5 if still unopened | Usual time | 1 push + 1 email per module, then nothing; the item stays in the in-app list | "Uzmanından yeni bir modül var. Hazır olduğunda başlayabilirsin." | Module opened within 24 h |
| E8 | Feature adoption | Practice task assigned, no record this week | Active training with a practice task | O | Push | Thursday, usual time | 1 per week per training | "Uygulama görevin için bu haftanın kaydını ekleyebilirsin." | Record added within 24 h |
| E9 | Feature adoption | 7 active days, only one caregiver in the family | Single parent account | L | In-app card only | When the Aile tab is opened | Shown twice at most | "Onayları paylaşmak ister misin? Diğer ebeveyni Aile bölümünden ekleyebilirsin." | Second caregiver invited |
| E10 | Monetization | Trial started | Trial entitlement active | T | Email + in-app line | Immediately | 1 | "Denemen başladı. 14 Aralık'ta sona eriyor; iptal etmezsen aylık ₺… ile yenilenir. Bitmeden 2 gün önce haber vereceğiz." | Delivered; no success target |
| E11 | Monetization | Trial ends in 2 days | Trial active, not cancelled | T (neutral reminder promised on the paywall; **needs lawyer** on classification) | Push if permission exists, otherwise email (not both) | Usual time, 2 days before the end (Blinkist [15], RevenueCat [15]) | 1 | "Denemen 2 gün sonra bitiyor. Devam etmek istemezsen App Store aboneliklerinden iptal edebilirsin." | Complaint and refund rate down; trial-to-paid not worse than holdout |
| E12 | Monetization | Renewal failed (RevenueCat billing issue event) | Subscriber in grace period | T | Email + in-app banner | Immediately; one repeat after 3 days | 2 | "Ödeme yenilenemedi. App Store ödeme bilgini güncellersen üyeliğin kesintisiz sürer." | Payment recovered within 7 days |
| E13 | Monetization | Free-tier parent reached a premium limit twice in 7 days | No active subscription; **marketing permission on** | M | In-app paywall always; push or email only with marketing permission | Next day at usual time | 1 per 14 days | "Yıllık pakette 2 ay hediye. Fiyat ve yenileme koşulları Üyelik sayfasında." | Purchase within 72 h |
| E14 | Win-back | 14 days and 30 days without a session | Marketing permission on (email) | M | Email | 10:00 local on day 14 and day 30 | 2, then never again until the parent returns | "Rutinlerin yerinde duruyor. Kaldığın yerden devam etmek istersen uygulamayı açman yeterli." | Session within 7 days |

Notes on this matrix:

- E4 and E7 already exist as server-written notifications. The matrix does **not** add a second message for the same thing; it adds batching (E4), one bounded follow-up (E7), and a stop rule (E6).
- E13 uses the "n ay hediye" figure that the app already computes from store prices; the internal rule (`ortak/hukuk/45` §1.5) that "free/gift" wording must sit next to price, period and auto-renewal applies, which is why the push only points to the page where all three are shown.
- Monetization messages for a trial (E10, E11) are written as neutral account information. Any added persuasion ("kaçırma", "son şans") would turn them into marketing.

---

## 4. Recommended message matrix: Moyo Mercek

Additional conventions for the clinician product:

- **Working-day rule.** Lifecycle and digest messages only on weekdays, 08:30–19:00 local time. Nothing about family activity is pushed at night or at weekends; it waits for the morning digest. (Linear [26], Slack [24], ClassDojo quiet hours [27]. The product is not a crisis-monitoring service, so there is no reason to interrupt a clinician at night.)
- No child name, no parent name, no behaviour detail in push or email subject lines. Counts only.
- Monetization messages go to the **owner** only; team members never see price (existing product rule).
- Purchases happen in the iPhone/iPad app, so monetization copy points there, including in emails opened on the web.
- Language: in-app Moyo Mercek uses "sen"; the public site uses "siz". The examples use "sen". Which form emails use is a product decision.
- The Takip Planı feature is behind a closed flag today; the matrix is built on Ebeveyn Eğitimi as the core loop.

| # | Stage | Trigger (event or absence) | Audience condition | Cat. | Channel | Timing rule | Cap | Example copy (TR) | Success = |
|---|---|---|---|---|---|---|---|---|---|
| M1 | Activation | Signed up and survey done, no family invited after 24 h | 0 invites, 0 clients | L | In-app Başlarken card (exists) + email | Next weekday 10:00 | 1 email; a second and last one on day 5 | "İlk aileni davet etmeye hazır mısın? Ebeveynin e-postasını yazman yeterli; daveti biz göndeririz." | Invite sent within 48 h |
| M2 | Activation | Invite sent, not accepted, expires in 24 h | Open invite | O | Push if permission exists, otherwise in-app only | 24 h before expiry, inside working hours | 1 per invite; the existing "invite expired" notification then replaces it in the tray (same collapse key) | "Gönderdiğin davetin süresi yarın doluyor. İstersen yeniden gönderebilirsin." | Invite accepted or resent within 24 h |
| M3 | Activation | First invite sent | Push permission not yet asked | L | In-app permission primer | Right after the first invite is sent | Once | "Aile daveti kabul ettiğinde ve ebeveyn bir modülü tamamladığında haber verelim mi? Gece ve hafta sonu bildirim göndermeyiz." | iOS permission granted |
| M4 | Activation | Family connected (notification exists) but no active training: (a) no training created after 48 h, or (b) a training left in Taslak for 72 h | Client with 0 trainings, or a draft never set to Etkin | L | One push per case; the "Senin sıran" reason on the home screen already shows it in-app | Next weekday 10:00 | 1 per client per case, max 1 such push per day; afterwards only in the digest | (a) "Yeni bir aile bağlandı. İlk eğitimi oluşturmak ister misin?" · (b) "Taslakta bekleyen bir eğitimin var. Etkin yaptığında ebeveyn görmeye başlar." | Training created, or set to Etkin, within 48 h |
| M5 | Habit | Parent completed a module, to-do or practice record (notification exists) | Item awaits review | H | Push, batched | First item of the day: immediate inside working hours; later items update the same push with the new count; outside working hours everything waits for M6 | Max 3 family-activity pushes per day | "İncelemeni bekleyen 3 kayıt var." | Items reviewed within 24 h |
| M6 | Habit | Start of a working day; on Mondays also families with no record for 7+ days ("Sessiz kalanlar") | Something to report: sessions today, items awaiting review, new parent records since the last visit, or (Monday) silent families | O | One channel chosen by the clinician: push (default if permission exists) or email. Silent families are a line in Monday's digest, never a separate push | Weekdays 08:30 local; **not sent when empty** (SimplePractice [29]) | 1 per weekday | "Bugün: 3 seans · 2 inceleme bekliyor · 1 yeni davranış kaydı." · Monday line: "Geçen hafta 2 aileden kayıt gelmedi. Liste ana ekranda." | App session within 2 h; for the Monday line, client opened or "Hatırlatma gönder" used within 48 h |
| M7 | Feature adoption | 7 days active, resource library never opened | At least 1 client | L | In-app tip + one email | Weekday 10:00 in the second week | 1 email | "Kaynak kütüphanesinde hazır modüller var. Seçtiğin modülü bir aileye eğitim olarak atayabilirsin." | Library opened or module assigned within 7 days |
| M8 | Feature adoption | A client has 4 weeks of records and the report has never been opened | Client linked for 28+ days | L | In-app tip on the client page only | When the client page is opened | Shown twice at most | "Son 4 haftanın kayıtlarıyla rapor oluşturabilirsin." | Report opened |
| M9 | Feature adoption | Clinic package owner with 1 clinician after 7 days | Owner, Klinik package or trial, team size 1 | L | Email | Weekday 10:00 | 1 | "Ekip hesabında yer var. Eklemek istediğin uzmanın kişisel kodunu girmen yeterli." | Team request sent within 7 days |
| M10 | Monetization | 14-day trial started | Owner | T | Email + existing in-app trial line | Immediately | 1 | "14 günlük denemen başladı; 1 Aralık'ta sona eriyor. Bitmeden 3 gün önce haber vereceğiz." | Delivered |
| M11 | Monetization | Trial ends in 3 days | Owner, no purchase | T (**needs lawyer** on classification) | Push if permission exists, otherwise email; plus in-app banner | Weekday 10:00 (moved to Friday if day 11 is a weekend) | 1 | "Denemen 3 gün sonra bitiyor. Paketleri iPhone ya da iPad'deki uygulamadan görebilirsin." | Purchase before trial end, compared with holdout |
| M12 | Monetization | Trial ended, no purchase | Owner at the paywall | T for the first, M for the second | Email | Day +1 at 10:00; one more on day +7 only with marketing permission | 2, then stop | "Denemen sona erdi. Üyelikle kaldığın yerden devam edebilirsin." | Purchase within 7 days |
| M13 | Win-back | Paying or trial clinician inactive 14 days while families keep sending records | Active client links | O | Email | Weekday 10:00, day 14 and day 28 | 2, then stop | "Ailelerinden 5 yeni kayıt var. Uygulamayı açtığında ana ekranda göreceksin." | Session within 7 days |
| M14 | Monetization | Two monthly renewals completed | Owner on monthly; **marketing permission on** | M | Email + in-app line on the membership page | Weekday 10:00, 5 days before the third renewal | 1 per 90 days | "Yıllık pakette 2 ay hediye. Fiyat ve yenileme koşulları Üyelik sayfasında." | Switch to yearly within 14 days |

Notes on this matrix:

- M2, M4 and M5 sit next to notifications that already exist (`invite_expired`, `clinic_shared` / `invite_claimed`, `training_activity`, `behavior_incident`, `abc_event`). They are follow-ups or batches of those rows, not new parallel messages.
- M12 deliberately does not promise that data is kept after the trial; retention of data after membership ends is still an open legal question in the project's own notes.
- Session reminders that the clinician configures in Takvim are user-set utilities and stay outside the lifecycle caps.

---

## 5. One anti-annoyance policy for both products

### 5.1 One gate

Every candidate message (existing therapist-triggered and task notifications included) passes through one server-side decision step before anything is sent, in the spirit of LinkedIn's Air Traffic Controller [17]. Each candidate carries: category (T/H/O/L/M), an object key (what it is about), the planned channel, earliest send time and expiry. The gate applies the rules below in order and records why a message was sent, merged, delayed or dropped. (Any new table or column for this belongs in the shared `ortak` contract first.)

### 5.2 Caps (proposal)

| | Moyo Ebeveyn | Moyo Mercek |
|---|---|---|
| Push, all categories except T | max **4 per day** | max **4 per day**, weekdays only (user-set session reminders excluded) |
| of which O approvals / family activity | max 2 per day, batched | max 3 per day, batched |
| of which L lifecycle | max **1 per day and 3 per week** | max **2 per week** |
| of which M marketing | max **1 per week and 2 per month**, only with marketing permission | same |
| Email, non-transactional | max **2 per week** (weekly summary + one other) | max 1 digest per weekday (only if not delivered by push) + max **1 lifecycle email per week** |
| Email, marketing | max 2 per month, only with marketing permission | same |
| In-app | one card or banner at a time on the home screen; no full-screen prompt more than once a week | same |
| T transactional | not capped, never bundled with promotion | same |

These numbers are a starting point, not a benchmark result. The published programs do not agree on one "right" cap (X found the right cap differs per user [23]); what they agree on is having a cap, counting per person, and exempting transactional messages [31] [33] [34].

### 5.3 Priority order when several messages are eligible

1. **T** account, billing, security, legal, consent revoked.
2. **H** a real person acted for this user (therapist assigned a module, parent completed something for the clinician, invite accepted, session changed).
3. **O** the user's own pending tasks and data (steps awaiting approval, items awaiting review, daily digest).
4. **L** lifecycle guidance.
5. **M** marketing.

Rules: a lower category is dropped, not queued, if a higher one about the same object was sent in the last 48 hours. L is suppressed if any H or O push went out in the last 6 hours, or if the user already had a session today. M is suppressed for 24 hours after any other push and for 14 days after a purchase, a cancellation, or a paywall visit that ended without purchase.

### 5.4 Quiet hours and timing

- Moyo Ebeveyn: no push between **21:00 and 08:00** local time. Events that happen in that window appear in-app immediately and are pushed, merged into one, at 08:00.
- Moyo Mercek: no push outside **weekdays 08:30–19:00**, except session reminders the clinician set. Family activity from evenings and weekends arrives in the next morning digest.
- Local time comes from the device time zone stored with the push token; fallback Europe/Istanbul.
- Send time for L messages: the user's "usual time" (section 3) for parents, 10:00 for clinicians. If the time falls into quiet hours, use the nearest edge of the window (same behaviour as Braze [32]).
- iOS interruption level: **active** for T, H and O; **passive** for L tips and the weekly summary; **never Time Sensitive** for L or M. Time Sensitive is used only for a session starting within an hour that the clinician asked to be reminded of [36].

### 5.5 Merging, duplicates, digests

- One push per object. A newer state replaces the older push (same collapse key and thread), so "3 adım" becomes "5 adım" instead of two banners [37].
- The same item never goes out on two channels at once. Email is a fallback: only if there is no push permission, or the push was not acted on by the fallback time, and never once the item has been seen in the app (Notion [25], Linear [26], ClassDojo [27], OneSignal [33]).
- Counts of small events go into digests (E5 weekly for parents, M6 daily for clinicians). An empty digest is not sent [29].
- `relevanceScore` is set by priority so that the H or O item is the one featured if the user has a scheduled summary [39].

### 5.6 Cool-downs

- Same message type to the same user: not again within 7 days (except the bounded sequences written in the matrices).
- Same copy variant: not again within 14 days. Keep 3 to 5 variants per recurring message and pick one the user has not seen recently (Duolingo [1] [2]).
- After the user dismisses an in-app card: not shown again for 30 days; after two dismissals, never.

### 5.7 Stop rules

- **Ignored three times:** three L pushes in a row with no tap and no target action within 24 hours → pause all L pushes for 14 days.
- **A week of silence:** after 7 days without a session, send the single stop message (E6) and end daily reminders (Duolingo [5] [11]). After that only the two win-back emails, and only where permitted.
- **Bounded follow-ups:** an unopened therapist item gets one push and one email, never more; after that it is the therapist's call (the existing manual "Hatırlatma gönder").
- **Any opt-out is final** for that category until the user turns it back on.

### 5.8 Overlap between existing notifications and lifecycle nudges

| Situation | Resolution |
|---|---|
| Therapist assigns a module (existing push) and the parent is also due an activation nudge | The therapist message wins; the lifecycle nudge is dropped for 48 hours. |
| Module still unopened after 48 hours | One follow-up (E7), unless the therapist pressed "Hatırlatma gönder" in the last 48 hours; then the automated follow-up is skipped. |
| Steps awaiting approval (existing) and the daily habit nudge on the same day | Only the approval push is sent; it already contains the reason to open the app. |
| Several children or routines finish close together | One push with the total count; details in-app. |
| Clinician gets parent activity (existing) and an activation nudge for the same client | Activity push wins; the nudge waits for the next working day and is dropped if the clinician opened that client meanwhile. |
| Trial reminder day coincides with other pushes | The trial reminder (T) is sent; L and M are dropped that day. |
| Invite about to expire (M2) and invite expired (existing) | Same collapse key: the expired notice replaces the warning. |

### 5.9 Permission and preference centre

- iOS permission is requested in context (E2, M3), after an in-app screen that says exactly what will be sent [38]. Push is never required for the app to work; everything is also in the in-app list [40].
- Marketing permission is a **separate switch, off by default**, with its own wording, and is not a condition for using the service [40] [47] [49] [51].
- Settings › Bildirimler in each app, with independent switches:
  - Moyo Ebeveyn: Onay bekleyen adımlar · Uzmanımdan gelenler · Hatırlatmalar ve ipuçları · Haftalık özet (e-posta) · Kampanya ve duyurular.
  - Moyo Mercek: Ailelerden gelenler · Günlük özet (bildirim ya da e-posta) · Seans hatırlatmaları · İpuçları · Kampanya ve duyurular.
- Every non-transactional email carries a one-click unsubscribe for its topic [41] [42].

---

## 6. What to measure

All of this can be done with the existing first-party events; no third-party SDK is needed.

| Metric | Definition | Use |
|---|---|---|
| Permission opt-in rate | Users who granted iOS push permission ÷ users who saw the in-app primer; also the share with permission among weekly active users | Health of the channel. Reference: median iOS opt-in is around half of users (Airship, theirs [35]) |
| Category opt-in / opt-out | Share with each Settings switch on; switch-offs per 1,000 sends by category | Which category annoys |
| Tap-through | Sends that led to an app open from the notification ÷ sends accepted by APNs | Diagnostic only; not the success measure |
| **Conversion within N hours** | Target action of that message (column "Success =") inside the window: 2 hours for O pushes (Duolingo's window [1]), 24 hours for L pushes, 72 hours to 7 days for email | Primary success measure |
| **Incremental lift** | Conversion of users who got the message minus conversion of a permanent 5–10% holdout that gets T, H and O but no L or M | The only honest proof that a nudge works [20] [22] |
| Time to activation | Parent: first approved step. Clinician: first training set to Etkin | Activation programme |
| Trial outcome | Trial start → paid; refund requests and complaints mentioning "unexpected charge" | Monetization (Blinkist-type effect [15] [16]) |
| **Guardrail: disable rate** | Users whose iOS permission flips from granted to denied, per week and within 24 hours of a given message type; tokens reported invalid by APNs | Stop or change any message type that raises it |
| **Guardrail: unsubscribe and complaints** | Email unsubscribes per send; spam complaints, kept far below Gmail's 0.3% line [41] | Protects deliverability of transactional email too |
| Volume per user | Distribution of pushes and emails per user per week by category | Confirms the caps hold |

Practical notes: record every gate decision (sent, merged, delayed, dropped and why); measure email by link clicks through a first-party link rather than open pixels; review the guardrails weekly and before raising any cap.

---

## 7. Legal and compliance notes

This section is not legal advice. Items marked **needs lawyer** are open.

### 7.1 Apple (verified on Apple's own pages)

- **Guideline 4.5.4:** "Push Notifications must not be required for the app to function, and should not be used to send sensitive personal or confidential information. Push Notifications should not be used for promotions or direct marketing purposes unless customers have explicitly opted in to receive them via consent language displayed in your app's UI, and you provide a method in your app for a user to opt out from receiving such messages." [40]
- **HIG:** marketing notifications need explicit permission through an in-app interface and an in-app settings screen; never Time Sensitive for marketing; avoid sensitive or personal information in notification content; avoid several notifications for the same thing [36] [37].
- **Provisional authorization** exists (quiet delivery with Keep / Turn Off), and Apple recommends asking in context rather than at first launch [38].
- **Guideline 5.1.2(vi):** data from HealthKit and similar APIs may not be used for marketing. Moyo does not use those APIs, but the same spirit is a sensible internal line for children's data [40].

### 7.2 Turkey: Law No. 6563, the Regulation and İYS

- **Rule:** commercial electronic messages may be sent only with the recipient's prior consent; merchants and craftsmen (tacir, esnaf) may be messaged without prior consent but can refuse (Law 6563 art. 6; Regulation art. 6) [43] [44].
- **Exemptions in the Regulation (art. 6):** (a) if the recipient gave contact details to be contacted, messages about change, use and maintenance of the goods or services provided need no separate consent; (b) in an ongoing subscription, membership or partnership, notices about collection, debt reminder, information update, purchase and delivery and similar are outside the consent rule, provided they do **not promote** any goods or services [44] (read through search extracts and reproductions; the consolidated text should be checked on mevzuat.gov.tr).
- **İYS:** senders register; consents and refusals for the covered channels (call, message, email) are kept there; messages cannot be sent to recipients without a consent recorded in İYS; refusals must be reported within three working days [44] [45] [46].
- **Do push notifications count?** The official İYS FAQ says that someone who sends only mobile push notifications does **not** have to report those recipients to İYS "under today's practice" [45]. Commentators disagree on whether push is nevertheless a "commercial electronic message" under the open-ended legal definition: some say it is outside [53], others say consent is required [53] [48]. **Needs lawyer.**
- **Advertising Board (Reklam Kurulu) decision 2024/4177** (meeting of 10 July 2025, no. 359): sending campaign and advertising push notifications through a marketplace app without a separate user consent and without an in-app way to opt out was treated as an unfair commercial practice; the phone's system-level permission was not accepted as consent for marketing [47] [48]. This applies to consumers, so it is directly relevant to Moyo Ebeveyn.
- **Practical consequence used in this design:** regardless of how the İYS question is answered, promotional push needs its own in-app opt-in and in-app opt-out. That satisfies Apple 4.5.4, the Advertising Board line and the KVKK announcement at once.
- **Clinicians and the merchant exemption.** Moyo Mercek users are mostly self-employed professionals or employees. No source found says that self-employed professionals count as tacir or esnaf for this exemption [45]. The design therefore treats clinicians like individuals: promotional email only with prior opt-in. **Needs lawyer.**

### 7.3 KVKK

- **Public announcement on mobile push notifications (KVKK, 14 January 2026):** consent for push must be split by purpose ("parçalı açık rıza", specificity). A single consent that covers service notifications and marketing content together undermines free will; controllers are asked to let users choose notification purposes [49].
- **Board decision 2018/119:** sending marketing SMS, calls or email without consent or another legal basis is unlawful processing [50].
- **Principle decision 2025/1072 (10 June 2025):** consent to marketing cannot be made a precondition of the service, and different consents cannot be collected in one step [51].
- **Automated analysis:** art. 11(1)(g) gives the data subject the right to object to a result against them that arises solely from automated analysis [52]. Lifecycle nudges are unlikely to be such a "result", but the legal basis for using usage data to personalize messages (legitimate interest or explicit consent) is **needs lawyer**.
- **Special-category data:** health data is special-category data; the processing conditions were changed by Law No. 7499, in force from 1 June 2024 [52]. Whether behaviour records and parent-training content in Moyo count as health data is **needs lawyer**. Until answered, the design keeps a bright line: **marketing messages are personalized only on account and subscription state, never on a child's routines, behaviour records or therapist content.**
- **Message content and transfer abroad:** push text travels through Apple's servers and email through the email provider. Keeping child names and behaviour details out of push text and email subject lines follows Apple's own guidance [37] and reduces exposure under KVKK's cross-border transfer rules. **Needs lawyer** for the transfer basis.

### 7.4 Classification used in this design

| Message type | Treated as | Why | Open point |
|---|---|---|---|
| Steps awaiting approval, therapist assigned a module, items awaiting review, daily digest | Service message about the user's own account | Regulation art. 6 exemptions [44]; KVKK announcement separates service notifications from marketing [49] | Lawyer to confirm for email |
| Onboarding and habit nudges, feature tips (L) | Service guidance with its own switch | No promotion of a paid product | Lawyer: are usage tips "use of the service provided" or promotion? |
| Trial start, trial ending, payment failed | Service message | Subscription and billing information, no promotion [44] | Lawyer: does a trial-ending reminder count as promotion under 6563 or Apple 4.5.4 once it mentions packages? |
| Yearly offer, discount, win-back "come back", new paid feature announcement | Marketing | Promotes a paid product | Requires in-app opt-in, opt-out, and for email an İYS record [45] |

### 7.5 Questions for the lawyer

1. Is a promotional mobile push a "ticari elektronik ileti" under Law 6563 today, and must push consents be recorded in İYS?
2. Does the operator of Moyo (current legal form) have to register with İYS as a service provider before sending any promotional email?
3. Are self-employed clinicians tacir or esnaf for the art. 6 exemption, or individuals?
4. Are activation and feature-adoption messages covered by the "change, use and maintenance" or "ongoing membership" exemptions, or do they need marketing consent? Does a win-back email to a lapsed free user count as marketing?
5. Is the trial-ending reminder a service message when it is neutral, and does it stay one if it names packages or prices?
6. What is the KVKK legal basis for using first-party usage events to choose and time lifecycle messages; is an objection or opt-out enough?
7. Are behaviour records and parent-training data special-category (health) data; if so, which messages may refer to them at all?
8. What may appear in push text and email given transfer abroad through Apple and the email provider?
9. Is there a Turkish consumer-law duty to notify before a subscription renews after a trial, beyond what Apple does?
10. Are there time-of-day restrictions for commercial messages in Turkey? (None was found in this research; not verified.)

---

## 8. What could not be verified

- **Direct reading.** Apart from Apple's pages, no source could be opened from this session; they were read through search extracts. To verify directly, these hosts need to be allowed in the session's network settings: research.duolingo.com, blog.duolingo.com, www.lennysnewsletter.com, subclub.com, www.kvkk.gov.tr, resmigazete.gov.tr, mevzuat.gov.tr, iys.org.tr, www.braze.com, documentation.onesignal.com, engineering.linkedin.com, engineering.fb.com, arxiv.org, eugeneyan.com.
- **Duolingo paper details.** The eligibility rules for templates and the exact recency-penalty parameters were not read; only abstract-level facts are used [1].
- **"23.5 hours."** Comes from a podcast with Duolingo's retention PM as summarized by third parties [5]; not found in the paper or the blog.
- **Stop rule.** 7 days (PM, podcast) versus 5 days (older CEO account); the exact wording and whether the last message is a push or an email come from user write-ups [11].
- **Streak-saver send time.** No Duolingo document gives the hour; "late evening" is from secondary sources.
- **Duolingo email cadence.** No primary source found.
- **Widget effect size.** Duolingo publishes no number [7].
- **Slack's default Do Not Disturb hours.** "22:00–08:00" appears only in 2015 press; the current help page describes an admin-defined default [24].
- **Notion's five-minute rule.** Appears in older or mirrored help versions [25].
- **Netflix 2026 post.** Read through a mirror, not the original [22].
- **Blinkist, Headspace, Calm figures.** Vendor, agency or secondary reports; no methodology published [13] [14] [15].
- **Airship opt-in medians.** Read through secondary summaries [35].
- **No documented material found** for Noom, Strava, Spotify, Airbnb, Canva and Greenlight notification programs; Joon is documented only by its App Store text and user manual [28].
- **Turkish texts.** The verbatim definition in Law 6563 art. 2, the consolidated wording of Regulation art. 6, the full KVKK announcement and the full Advertising Board decision were not read in the original; no source was found on whether self-employed professionals are tacir/esnaf; no 2026 draft bringing push into İYS was found.

---

## 9. Sources

1. Yancey, K. P. and Settles, B., "A Sleeping, Recovering Bandit Algorithm for Optimizing Recurring Notifications", KDD 2020. https://research.duolingo.com/papers/yancey.kdd20.pdf (ACM: https://dl.acm.org/doi/10.1145/3394486.3403351)
2. Duolingo Blog, "Hi, it's Duo: the AI behind the meme". https://blog.duolingo.com/hi-its-duo-the-ai-behind-the-meme/
3. Duolingo Dataverse, replication data for [1]. https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/23ZWVI
4. Jorge Mazal, "How Duolingo reignited user growth", Lenny's Newsletter. https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth
5. Sub Club by RevenueCat, "How to Time Reactivation Campaigns for Maximum Impact — Jackson Shuttleworth, Duolingo". https://subclub.com/episode/how-to-time-reactivation-campaigns-for-maximum-impact-jackson-shuttleworth-duolingo
6. Lenny's Podcast, "Behind the product: Duolingo streaks | Jackson Shuttleworth". https://www.lennysnewsletter.com/p/behind-the-product-duolingo-streaks
7. Duolingo Blog, widget feature. https://blog.duolingo.com/widget-feature
8. Duolingo Blog, "How Duolingo streak builds habit". https://blog.duolingo.com/how-duolingo-streak-builds-habit
9. Duolingo Blog, "Back from the brink: what Duolingo learned about its resurrected users". https://blog.duolingo.com/back-from-the-brink-what-duolingo-learned-about-its-resurrected-users
10. Duolingo Help, "What is a streak?" (practice reminders setting). https://www.duolingo.com/help/what-is-a-streak
11. Secondary accounts of the stop message: Debugger, "Duolingo Needs to Chill" https://debugger.medium.com/duolingo-needs-to-chill-8f1832745ca0 ; Dreamlit, "Re-engagement Emails: Duolingo's Playbook for User Retention" https://dreamlit.ai/blog/how-one-simple-email-type-can-10x-your-user-retention
12. Neowin, "Duolingo is now mixing A/B testing and copy testing to boost user engagement". https://www.neowin.net/news/duolingo-is-now-mixing-ab-testing-and-copy-testing-to-boost-user-engagement/
13. Amplitude, "How Calm Increased Retention 3X With Amplitude". https://amplitude.com/blog/calm-increased-retention-amplitude
14. Phiture, "How Targeted In-App Messages Super-Charged Headspace's Push Opt-Ins". https://phiture.com/success-stories/headspace-inapps/
15. RevenueCat, "How to add trial notifications to your subscriptions" https://www.revenuecat.com/blog/engineering/how-to-add-trial-notifications-to-your-subscriptions ; RevenueCat, "How to build a Blinkist-style paywall using RevenueCat webhooks and Zapier" https://www.revenuecat.com/blog/engineering/how-to-build-a-blinkist-style-paywall-using-revenuecat-webhooks-and-zapier ; secondary summary of the Blinkist test https://b2bpricinginsights.substack.com/p/4-min-read-how-blinkists-new-paywall
16. Curtis Herbert, "Slopes Diaries #39: Risky Business". https://blog.curtisherbert.com/slopes-diaries-39-risky-business/
17. LinkedIn Engineering, "Air Traffic Controller: Member-First Notifications at LinkedIn". https://engineering.linkedin.com/blog/2018/03/air-traffic-controller--member-first-notifications-at-linkedin
18. LinkedIn Engineering, "Less Is More: Optimizing Email Volume, Part 2" https://engineering.linkedin.com/blog/2016/07/less-is-more--optimizing-email-volume-part-2- ; "How experimentation helped LinkedIn improve email communication" https://engineering.linkedin.com/blog/2015/10/how-experimentation-helped-linkedin-improve-email-communication
19. Analytics at Meta, "Notifications: why less is more". https://medium.com/@AnalyticsAtMeta/notifications-why-less-is-more-how-facebook-has-been-increasing-both-user-satisfaction-and-app-9463f7325e7d
20. Meta Engineering, "Improving Instagram notification management with machine learning and causal inference" https://engineering.fb.com/2022/10/31/ml-applications/instagram-notification-management-machine-learning/ ; "A new ranking framework for better notification quality on Instagram" https://engineering.fb.com/2025/09/02/ml-applications/a-new-ranking-framework-for-better-notification-quality-on-instagram/
21. Pinterest Engineering, "User state-based notification volume optimization" https://medium.com/pinterest-engineering/user-state-based-notification-volume-optimization-7764118f73ff ; "NEP: Notification System and Relevance" https://medium.com/pinterest-engineering/nep-notification-system-and-relevance-a7fff21986c7
22. Netflix Technology Blog, "Thinking Fast & Slow for a Personalized Notification System" (June 2026), read via mirror. https://noise.getoto.net/2026/06/20/thinking-fast-slow-for-a-personalized-notification-system/
23. X Engineering, "A hybrid approach to personalize notification volume". https://blog.x.com/engineering/en_us/topics/insights/2022/a-hybrid-approach-to-personalize-notification-volume
24. Slack Help, "Configure your Slack notifications" https://slack.com/help/articles/201398467 ; "Set default Do Not Disturb hours" https://slack.com/help/articles/214888418
25. Notion Help, "Notification settings". https://www.notion.com/help/notification-settings
26. Linear Docs, "Notifications". https://linear.app/docs/notifications
27. ClassDojo Help, "Notifications and Your Parent Account" https://help.classdojo.com/hc/en-us/articles/360050778411-Notifications-and-Your-Parent-Account ; ClassDojo Blog, "Introducing: Quiet Hours for teachers" https://blog.classdojo.com/introducing-quiet-hours-for-teachers/
28. Joon, App Store listing https://apps.apple.com/app/apple-store/id1482225056 ; Joon user manual, "How Joon works" https://joonapp.io/user-manual/how-joon-works
29. SimplePractice Help, "Receiving the Daily Agenda and Evening Summary emails" https://support.simplepractice.com/hc/en-us/articles/19472609539469-Receiving-the-Daily-Agenda-and-Evening-Summary-emails-from-SimplePractice ; mobile push notification preferences https://support.simplepractice.com/hc/en-us/articles/42091439662349 ; appointment reminders https://support.simplepractice.com/hc/en-us/articles/42052535058957
30. Jane App Guide, "Email & SMS reminders". https://jane.app/guide/email-sms-reminders
31. Braze Docs, "Rate limiting and frequency capping". https://www.braze.com/docs/user_guide/messaging/messaging_fundamentals/frequency_capping
32. Braze Docs, "Quiet hours" https://www.braze.com/docs/user_guide/messaging/messaging_fundamentals/quiet_hours ; "Intelligent Timing" https://www.braze.com/docs/user_guide/brazeai/intelligence/intelligent_timing
33. OneSignal Docs, "Frequency capping" https://documentation.onesignal.com/docs/frequency-capping ; "Fallback messages: Email or SMS when push is unavailable" https://documentation.onesignal.com/docs/push-fallback-method
34. Customer.io Docs, "Message frequency limits". https://docs.customer.io/messaging/send/message-limits
35. Airship, "Mobile App Push Notification Benchmarks for 2025". https://airship.com/resources/benchmark-report/mobile-app-push-notification-benchmarks-for-2025
36. Apple Human Interface Guidelines, "Managing notifications". https://developer.apple.com/design/human-interface-guidelines/managing-notifications
37. Apple Human Interface Guidelines, "Notifications". https://developer.apple.com/design/human-interface-guidelines/notifications
38. Apple Developer Documentation, "Asking permission to use notifications". https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications
39. Apple Developer Documentation, `relevanceScore`. https://developer.apple.com/documentation/usernotifications/unnotificationcontent/relevancescore
40. Apple, App Store Review Guidelines (4.5.4, 5.1.1, 5.1.2, 1.3, 5.1.4). https://developer.apple.com/app-store/review/guidelines/
41. Google, "Email sender guidelines" https://support.google.com/mail/answer/81126 ; "Email sender guidelines FAQ" https://support.google.com/a/answer/14229414
42. Resend Docs, "Topics" https://resend.com/docs/dashboard/topics/introduction ; "Managing unsubscribe list" https://resend.com/docs/dashboard/audiences/managing-unsubscribe-list
43. Law No. 6563 on the Regulation of Electronic Commerce (text). https://www.lexpera.com.tr/mevzuat/kanunlar/elektronik-ticaretin-duzenlenmesi-hakkinda-kanun-6563 ; copy at the Ministry of Justice https://mgm.adalet.gov.tr/Resimler/SayfaDokuman/211020191144436563.pdf
44. Ticari İletişim ve Ticari Elektronik İletiler Hakkında Yönetmelik: Official Gazette 15 July 2015 no. 29417 https://resmigazete.gov.tr/eskiler/2015/07/20150715-4.htm ; consolidated text https://www.lexpera.com.tr/mevzuat/yonetmelikler/ticari-iletisim-ve-ticari-elektronik-iletiler-hakkinda-yonetmelik ; 2020 amendment https://alomaliye.com/2020/01/04/ticari-iletisim-ve-ticari-elektronik-iletiler/
45. İleti Yönetim Sistemi, "Sıkça Sorulan Sorular". https://iys.org.tr/iys/sss
46. Ministry of Trade, "Ticari elektronik iletiler: genel bilgiler" https://ticaret.gov.tr/ic-ticaret/ticari-elektronik-iletiler/genel-bilgiler ; "İleti Yönetim Sistemi (İYS)" https://ticaret.gov.tr/ic-ticaret/ticari-elektronik-iletiler/ileti-yonetim-sistemi-iys
47. Moroğlu Arseven, "The Advertising Board has issued an important decision regarding campaign and advertising notifications sent through the mobile application of an online marketplace" (decision 2024/4177). https://www.morogluarseven.com/insights/publications/articles-en/the-advertising-board-has-issued-an-important-decision-regarding-campaign-and-advertising-notifications-sent-through-the-mobile-application-of-an-online-marketplace/
48. Yazıcıoğlu Legal, "Anlık Bildirimler (Push Notification) için Onay Alınma Yöntemi Reklam Kurulunun Radarında" (Lexology). https://www.lexology.com/library/detail.aspx?g=c9f9c1b7-a1bf-4558-a442-a64acb915736
49. KVKK, "Mobil Uygulamalar Üzerinden Gönderilen Anlık Bildirimlere İlişkin Kamuoyu Duyurusu". https://www.kvkk.gov.tr/Icerik/8578/mobil-uygulamalar-uzerinden-gonderilen-anlik-bildirimlere-iliskin-kamuoyu-duyurusu ; reproduction dated 14 January 2026 https://www.alomaliye.com/2026/01/14/mobil-uygulamalarda-tek-tik-riza-donemi-bitiyor-bildirim-amaclari-ayrilacak/
50. KVKK Board decision 2018/119 (16 October 2018). https://www.kvkk.gov.tr/Icerik/5299/2018-119
51. Summaries of KVKK principle decision 2025/1072: Erdem & Erdem https://www.erdem-erdem.av.tr/bilgi-bankasi/urun-ve-hizmet-sunumu-sirasinda-sms-ile-dogrulama-kodu-gonderimine-son ; Tetra Bilişim https://www.tetrabilisim.com.tr/post/2025-1072-sayili-kvkk-kurul-kararlari
52. KVKK, "Madde ve Gerekçesi ile Kişisel Verilerin Korunması Kanunu" https://www.kvkk.gov.tr/Icerik/5388/Madde-ve-Gerekcesi-ile-Kisisel-Verilerin-Korunmasi-Kanunu-Bilgi-Notu-ve-Kisisel-Verilerin-Korunmasina-Iliskin-Terimler-Sozlugu ; Erdem & Erdem, "Sağlık Verilerinin İşlenmesine İlişkin Yeni Düzenleme" https://www.erdem-erdem.av.tr/bilgi-bankasi/saglik-verilerinin-islenmesine-iliskin-yeni-duzenleme
53. Diverging commentary on push and İYS: Lexpera Blog, "Ticari Elektronik İleti Uygulamalarında Yeni Dönem: İleti Yönetim Sistemi" https://blog.lexpera.com.tr/ticari-elektronik-ileti-uygulamalarinda-yeni-donem-ileti-yonetim-sistemi/ ; Ersin & Yayla, "Ticari Elektronik İleti'de Sıkça Sorulan Sorular" https://www.ersinyaylahukuk.com/guncel-tartismalar/ticari-elektronik-iletide-sikca-sorulan-sorular
