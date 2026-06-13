-- v13: web push-prenumerationer för notiser (t.ex. "Resultaten är rättade").
-- En användare kan ha flera prenumerationer (en per enhet/webbläsare).
-- Utskick sker server-side med service-klienten; RLS låter användaren hantera
-- sina egna prenumerationer från klienten.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists idx_push_subscriptions_user on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

create policy "Användare hanterar egna push-prenumerationer"
  on push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
