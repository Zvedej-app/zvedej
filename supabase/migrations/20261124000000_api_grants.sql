-- Přístup k tabulkám přes Data API (PostgREST) pro role aplikace.
-- Nové projekty Supabase ho nemusí dávat automaticky (volba „Grant API access to new tables
-- automatically“). Funkce se tu záměrně neřeší: chráněné funkce mají vlastní revoke v init migraci.
-- Co kdo smí číst a měnit, dál hlídají pravidla RLS u jednotlivých tabulek.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
