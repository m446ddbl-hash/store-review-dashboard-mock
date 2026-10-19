-- No.10 existing-table migration: inventory_forecast_state.payload
-- Run this once in Supabase SQL Editor before saving No.10 data.
-- Legacy array payloads are preserved as {"skus": [...]} objects.
-- The app supplies its demo event list when the optional "events" key is absent.

alter table public.inventory_forecast_state
  drop constraint if exists inventory_forecast_state_payload_check;

update public.inventory_forecast_state
set payload = jsonb_build_object('skus', payload)
where jsonb_typeof(payload) = 'array';

alter table public.inventory_forecast_state
  add constraint inventory_forecast_state_payload_check
  check (
    jsonb_typeof(payload) = 'object'
    and jsonb_typeof(payload->'skus') = 'array'
    and (not (payload ? 'events') or jsonb_typeof(payload->'events') = 'array')
  );
