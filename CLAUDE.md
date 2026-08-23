# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Platform context

This repo is the **web half** of the Sheetal Automobiles Fleet Service Management Platform (Tata Motors authorised service center, Malegaon). The **primary app is a separate React Native + Expo (SDK 52, Expo Router) mobile codebase** used by roaming workshop roles (advisor, gateman, mechanic, painter, denter, electrician, washing, alignment, tyre, pdi, billing, cashier, front_checkup, 3m). This web repo covers desk-based roles — Owner, Receptionist, public Booking — plus web versions of Advisor/Billing/Cashier/Spare that exist in this repo's `src/components/` but are not the roles' primary (mobile) implementation. Both apps share one Supabase Postgres backend (project `axvjeolvntehhphhrxtt`, ap-south-1 Mumbai) — schema/RLS changes here affect the mobile app too.

Scale (as of v3.2.0, July 2026): 500+ vehicles/month, 700-800 bookings/month, 45+ staff across 14 roles.

## Stack

Vite + React 19 SPA, plain JS/JSX (not TypeScript — `@types/react` packages are dev-only editor hints, no `.ts`/`.tsx` in `src/`). Supabase (`@supabase/supabase-js`) for auth/data. No React Router — routing is manual, no CSS framework — styling is inline `style={{}}` objects. Deployed to Vercel (booking form also served at `booking.keeltech.in`). WhatsApp notifications (Meta WhatsApp Business API) are sent from the receptionist flow via a `send-whatsapp` Supabase Edge Function.

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — ESLint (flat config, `eslint.config.js`)
- No test script exists and no test framework is configured — don't assume `npm test` works.
- No Prettier/Biome — ESLint is the only style enforcement.

## Routing and auth (non-obvious, manual)

`src/App.jsx` does routing entirely via `window.location.pathname`/`hostname` checks and an `if/else` chain on `user.role` — there is no react-router. `hostname === "booking.keeltech.in"` or path `/book` bypasses auth to the public `BookingPage`.

Login uses phone number + password: `Login.jsx` converts the phone into a synthetic email (`${phone}@sheetal.auto`) for `supabase.auth.signInWithPassword`, then looks up the matching row in `public.users` by `auth_id`. This same shim is duplicated in `supabase/functions/create-user/index.ts`. **Changing this pattern in one place without the other breaks login** — keep them in sync.

Session state (`user`) is the `public.users` row, persisted to `localStorage`, not the raw Supabase auth session.

`users.role` values — **live DB `users_role_check` CHECK constraint is the ground truth**, not the platform docx (which predates several changes): `gateman, front_checkup, advisor, mechanic, alignment_balancing, washing, painter, denter, electrician, 3m, spare_part_manager, billing, cashier, owner, receptionist, body_shop_advisor, staff`. `staff` is a minimal generic role (mobile-only `app/staff.js`: attendance + leave, no vehicle-workflow ties) — not yet wired into `App.jsx`'s role switch, falls through to "under construction" on web. `tyre_fitting` was a role value that existed in the constraint but was **retired** (no department, no screen on either platform, zero users) — removed from the constraint; don't reintroduce it without checking current state first. `receptionist` is **no longer web-only** — mobile now has `app/receptionist.js` too; don't assume it's web-exclusive in UI copy. Only `owner, advisor, billing, cashier, receptionist, spare_part_manager` are wired into `App.jsx`'s role switch; every other role (including `body_shop_advisor`, `staff`, and all workshop-floor roles) falls through to the "under construction" fallback on web — check `App.jsx` directly before assuming a role routes somewhere real.

## Supabase schema

No `supabase/migrations/` or `config.toml` in this repo — schema is not version-controlled locally. Reference the platform technical report (`24 July Sheetal_Platform_Report_v3.2.0_Updated_v3.docx`, one directory above this repo) for full column-level schema; it may drift from production, so **ask the user directly** before anything schema-sensitive (migrations, new queries against unfamiliar tables).

Core tables and workflow (from that report, as of v3.2.0):
- **`vehicles`** — one row per vehicle visit. `current_stage` moves through `entry → front_checkup → advisor_review → pending → [dept work] → pdi → billing → payment → ready_for_exit → completed`. Soft-deleted via `deleted_at`; `is_locked`/`locked_by` prevents concurrent edits.
- **`work_stages`** — one row per vehicle, one `{dept}_status`/`{dept}_required`/`{dept}_team_id` column group per department (`mechanic, painter, denter, electrician, three_m, washing, alignment_balancing, tyre_fitting`), which run in parallel while the vehicle is in the `pending` stage.
- **`bookings`** — public booking form submissions. `status`: `pending | confirmed | arrived | completed | cancelled | no_show | rescheduled`. `ref_number` format `BK-YYYYMMDD-NNNN`. Reschedules create a **new** row (`rescheduled_from` FK) rather than mutating the original. `contact_person` is an unstructured free-text field packing referrer + submitter info (e.g. `"Ref: Gokul | Filled by: Pawan (9876543210)"`) — parse defensively, don't assume a fixed format; a proper `created_by` UUID column is planned but not yet built.
- **`users`** — `role` (see above), `auth_id` FK to `auth.users`, `team_id` for dept workers, `is_active` gates login.

`supabase/functions/create-user/index.ts` is a Deno edge function for user management (service-role privileged, requires caller `role === "owner"`).

**RLS is now enabled on 35 public tables** (confirmed live, Aug 2026 — includes `vehicles`, `users`, `payments`, `work_stages`, `config_options`, `bookings`, department detail tables, recalls tables, and more) — this is a big change from the previous "mostly disabled" state; a mobile-app session added RLS broadly. Policies checked directly (`vehicles`/`users`/`payments`/`config_options`): all grant access by **role class** (`authenticated` can read/write broadly), not narrowly per-row, so this doesn't restrict what an already-logged-in user of this app can do — every dashboard here authenticates via real Supabase Auth (see Login above), so `auth.uid()` resolves and `authenticated`-role policies apply normally. Still worth knowing: the **anon key** (no session) is blocked on RLS-enabled tables, which is why anon-key REST introspection below returns `0` rows on those tables regardless of query correctness — don't mistake that for "table is empty." A `rls_auto_enable` DB trigger auto-enables RLS on any newly created table, so a new table with no explicit policy will silently deny access until policies are added.

**Department detail tables** — `mechanic_details`, `painter_details`, `denter_details`, `electrician_details` (one row per vehicle, upserted on `vehicle_id`) hold the free-text work description for the four departments with no fixed work-type checklist (`work_assigned` jsonb array, plus `notes`, `created_by`). **`painter_details` has no `team_id` column** — confirmed by direct query against production (mechanic/denter/electrician_details all do have one). Any write to all four tables via a shared loop must special-case painter to omit `team_id`, or it 400s. `three_m_details`/`alignment_details`/`washing_details` are separate tables with their own `work_types`/`washing_types` shape (see mobile `advisor.js` if reimplementing). `service_templates` (`service_type`, `is_active`, `sort_order`, `name`, `departments` jsonb) drives auto-fill when an advisor picks a matching service type in Assign Work.

**Verifying live schema — two tools, different reach.** (1) Anon-key REST introspection: a nonexistent column reliably 400s with `{"code":"42703","message":"column X does not exist"}` on any table, while a real column 200s — works even for row-count-blocked tables (see below), since PostgREST validates columns before evaluating access. `curl -s "$URL/rest/v1/vehicles?select=id,some_column&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"`. (2) **`supabase db query --linked "<SQL>"`** — real SQL access to the production DB via the Management API (the CLI is already authenticated in this environment; no DB password needed). This is far more capable: `EXPLAIN ANALYZE` on real queries, reading `pg_constraint`/`information_schema` for ground-truth schema (CHECK constraints, exact column lists), and — with `ALTER TABLE`/etc. — actually changing schema. Treat schema changes via this path with the same care as any other production DB write: confirm before running anything destructive. Note: the **anon key cannot read some tables at all** (`vehicles`, `users`, `bookings`, `payments`, `work_stages` confirmed blocked — even a fully unfiltered query returns `0` rows) while others are readable (`mechanic_details`, `config_options`, `service_templates`, etc.) — don't infer "table is empty" from an anon-key `0` result on a table that might just be access-blocked; use `supabase db query --linked` for a real count instead.

**Edge functions can drift from this repo's source — verify before trusting local code.** `supabase functions download <name> --project-ref axvjeolvntehhphhrxtt` overwrites the local file with what's *actually deployed*, which is the only reliable way to know what's really running. This has already caught a real bug once: `supabase/functions/create-user/index.ts`'s deployed version had a line (`updateData.password_hash = password`) that didn't exist in the git-tracked source and referenced a column that doesn't exist on `users`, breaking every password change. If a bug report doesn't match what the local `.ts` file does, download-and-diff before assuming the local source is what's live. After fixing, `supabase functions deploy <name> --project-ref axvjeolvntehhphhrxtt` to redeploy, then download again to confirm no drift remains.

## Codebase structure

`src/components/` is flat — no `hooks/`, `pages/`, or `utils/` subdirectories. Role-based dashboards are large, mostly self-contained single files that query Supabase inline (no shared data-access layer):

- `OwnerDashboard.jsx` (~12,800 lines), `ReceptionistDashboard.jsx` (~6,400), `AdvisorDashboard.jsx` (~4,000), `CashierDashboard.jsx` (~4,000), `BillingDashboard.jsx` (~2,800), `SpareDashboard.jsx`, `BookingPage.jsx` (public), `Login.jsx`.

`AdvisorDashboard.jsx` was fully rewritten from scratch (not incrementally patched) to reach feature parity with the mobile app's `advisor.js` (the mobile file is the primary/richest implementation of this role — see Platform context above). Single-file by deliberate choice, matching this repo's per-dashboard convention, even though a multi-file split was considered. Known, intentional gaps vs. mobile:
- **Attendance QR/camera punch omitted** — no web camera equivalent exists anywhere in this codebase; advisors still punch attendance via mobile.
- **Per-tyre clip/sticker weight entry not built** — checked mobile's source directly: advisors never had this input either (it's read-only display in mobile's PDI view, entered by a different mobile role's screen). Don't add it to web without scoping who else needs to write it first.
- A new web-only `LeaveApplicationModal` was added (mobile's advisor-facing leave modal has no direct web port available) — writes to `leave_applications` with columns `user_id, leave_type, from_date, to_date, reason, status, created_at` (confirmed against `OwnerDashboard.jsx`'s existing leave-review UI, not guessed).

Given the file sizes, read targeted line ranges or grep rather than loading a whole dashboard file at once.

**Every dashboard's main data-load is wrapped in `withTimeout()`** (a local `Promise.race` helper duplicated per-file, matching this repo's convention of not sharing utility modules across dashboards) and sets a `loadError` state rendered as a visible "Couldn't load dashboard data" retry screen on failure. Before this, a stalled network request would hang the loading spinner forever with no way out — if you add a new dashboard or a new main fetch, follow the same pattern rather than a bare `await Promise.all(...)`.

**Config-driven fields can silently drift from hardcoded fallback lists.** Several dashboards define a `DEFAULT_*` array/object as a fallback for when `config_options` is empty, then read live values via a `getList(category, fallback)`-style helper — but it's easy to reference the `DEFAULT_*` constant directly in a dropdown instead of going through the helper, which then silently omits any config-only entries. This exact bug existed in `AdvisorDashboard.jsx`'s vehicle-model dropdowns (missing 3 of 21 real active models) until fixed — when adding a new config-driven dropdown, grep for how sibling fields in the same file already do it and match that, don't hardcode.

`BeautifulComponents.jsx` is a copy-paste style reference, not a component library that's consistently imported — check actual imports before assuming a dashboard uses it.

## Cashier bill-override (cashier can bill+pay before Billing does)

Cashier can enter a bill amount directly for any active vehicle that hasn't reached Billing yet (from `CashierDashboard.jsx`'s merged Vehicles tab → "Other Vehicles" section → "💳 Take Payment"), bypassing the Billing department entirely — no threshold, any vehicle, any time. This writes the normal `bill_amount`/`bill_generated_at`/`bill_generated_by` fields on `vehicles` plus an override audit trail: `billed_by_cashier_override`, `billed_by_cashier_override_by`, `billed_by_cashier_override_at`, `billed_by_cashier_override_reviewed`, `billed_by_cashier_override_reviewed_by`, `billed_by_cashier_override_reviewed_at` (all added this session, not in the original platform report). `current_stage` is deliberately **not** advanced by this path — the vehicle still has to complete its normal workshop journey; only payment timing is decoupled from stage.

The override flag is surfaced **only** in `BillingDashboard.jsx`'s "⚡ Cashier Overrides" section (top of page, independent of `current_stage` so it still shows vehicles that have already exited) — no other dashboard reads or displays these columns. Once billing marks an override "✅ Reviewed," it's set `billed_by_cashier_override_reviewed = true` and disappears from that list (not deleted, just filtered out).

`CashierDashboard.jsx`'s vehicle list is a single merged view (`VehiclesTab`, not two tabs) — "At Cashier" (bill already generated, awaiting payment) always expanded, "Other Vehicles" (grouped by stage, includes the override entry point) collapsible and deduped against "At Cashier" since the underlying queries overlap. One search box filters both sections at once.

## Spare dashboard — two-step parts fulfillment

`part_orders.status` has a fifth value, `completed`, in addition to `pending | confirmed | delivered | cancelled` — **`delivered` is no longer terminal**. Fulfillment is two deliberate steps: (1) spare marks every item confirmed/unavailable then "Mark Delivered" (unchanged, existing flow) — the order lands in a distinct "Awaiting Job Card" bucket, still in the Pending tab, not history; (2) a separate "✅ Confirm Job Card Updated" action moves it `delivered → completed`, writing `part_orders.jobcard_confirmed_by`/`jobcard_confirmed_at`. Only `completed`/`cancelled` count as history now.

`part_order_items.fulfilled_quantity` (what was actually given, vs. `quantity` = original request) is **staged client-side only** — a local `stagedQuantities` state map keyed by item id, read via `getStagedQty(item)` (falls back to `item.fulfilled_quantity ?? item.quantity`), never written to the DB until the item is marked "✓ Have," at which point it's included in that same update alongside `status: "confirmed"`. Don't wire the quantity stepper directly to a Supabase call — this is a deliberate stage-then-commit pattern, matching mobile exactly.

Every spare action (`setItemStatus`, `markDelivered`, `confirmJobCardUpdated`, `cancelOrder`) patches `orders` state locally after a successful write instead of refetching — a full refetch per click was the actual cause of the dashboard feeling slow, not a sort/render issue. The realtime subscription on `part_orders`/`part_order_items` is still the backstop for picking up other sessions' changes (800ms debounced), but a session's own action never re-fetches for itself.

## Follow-ups tab — "who needs action" (owner-only, `OwnerDashboard.jsx`)

Added to catch this dashboard up on a batch of mobile-side schema/feature changes (see `web-dashboard-handoff-prompt.md` in repo root for the full handoff doc this was built from). Consolidates several `vehicles` boolean flags plus the recalls Cancel Review queue into one tab, each section independently filtered/sorted — deliberately **not** part of the shared `vehicles` app state (which is scoped to active-or-touched-today only) since a stale unopened job card or a months-old unrenewed AMC must still surface here. New `vehicles` columns this covers: `is_revisit`, `is_warranty_work`, `is_offline_jobcard` (+`offline_jobcard_open_date`/`_opened`/`_opened_at`/`_opened_by`), `is_manual_exit`, `order_cancelled`, `extended_warranty_eligible`/`_renewed`/`_expiry_date`, `amc_*`, `rsa_*` (same 3-column shape per policy), `bodyshop_stage`, `daily_token_number`, `free_service_number`, `scheduled_service_type`, `scheduled_major_interval`. `bodyshop_advisor_id` exists on the schema but is confirmed dead (0 rows ever set) — advisor assignment for the body-shop track goes through the same `advisor_id` column as workshop, disambiguated by `users.role = 'body_shop_advisor'`.

**Recalls Cancel Review** (`vehicle_recalls`/`vehicle_recall_calls`, the latter has an `action_type` column — `'call'`/`'date_change'`) — Approve writes `vehicle_recalls.status = 'cancelled'` **and** `vehicles.order_cancelled = true` on the recall's *original* `vehicle_id` (not any later "arrived" visit — a DB trigger creates a new `vehicles` row on re-entry and flips `status` to `'arrived'` automatically, unrelated to this flow). Reject reverts `status` to `pre_cancel_status` (fallback `'pending'`). Both stamp `owner_reviewed_by`/`owner_reviewed_at`.

**EW/AMC/RSA renewal follow-up list** is genuinely new (no mobile equivalent existed to port) — read-only for now, one row per vehicle × eligible-unrenewed policy, "last seen" is that same visit row's own `entry_time`/`current_stage` (not a separate most-recent-visit lookup).

`booking_service_type` was restructured mobile-side into 4 active options (`free_service`/`scheduled_service`/`running_repair`/`breakdown`) with the old 6-option scheme (`first_free_service` etc.) kept `is_active: false` for historical bookings only — `ConfigTab`'s edit dialog locks those 6 rows' label/color/sort fields (only the active-toggle stays live) to prevent accidentally reshaping history. **`service_templates.service_type` still uses the OLD 6-option scheme** — it was deliberately not migrated (mobile reconstructs an old-style key from the new cascade before querying), so `TemplatesTab`'s service-type picker is a fixed dropdown of old-scheme keys, not free text, specifically so a new-scheme key can't be written there by mistake.

## Known limitations (platform-wide, affects this web app too)

- **RLS is broadly enabled but role-class-scoped, not per-row** (see above) — an authenticated session gets normal access; don't expect row-level restrictions without checking the actual policy `qual`.
- **Single-tenant** — no `tenant_id` column anywhere; schema assumes one business.
- **`contact_person` string-packing** (see above) — "Registered by Me" on the receptionist dashboard matches by first-name substring against this field, which is fragile if two receptionists share a first name.
- **Washing slot capacity** is a soft UI limit (3/slot) with no DB constraint — concurrent bookings can over-book a slot.
- **`service_completed` WhatsApp template is blocked** (Marketing-category template requires Meta OBA verification) — sends will fail silently until that's resolved.

## Known issue: `.env` in git

`.env` (containing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) is tracked in git and not in `.gitignore`. This is known/accepted for now — don't re-flag it, but also don't assume it's safe to paste its contents elsewhere.
