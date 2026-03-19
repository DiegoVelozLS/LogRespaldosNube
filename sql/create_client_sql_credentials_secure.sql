-- SQL Vault Bootstrap (single script, idempotent)
-- This script leaves the vault independent from public.clients.
-- Required after running: configure vault key in sql_vault_config table.

begin;

create extension if not exists pgcrypto;

create table if not exists public.sql_vault_config (
    id boolean primary key default true,
    encryption_key text not null,
    updated_at timestamptz not null default now(),
    check (id = true)
);

create table if not exists public.client_sql_credentials (
    id uuid primary key default gen_random_uuid(),
    client_id uuid,
    company_name text,
    sql_username text not null,
    encrypted_password bytea not null,
    db_name text not null,
    notes text,
    created_by uuid references public.users(id),
    updated_by uuid references public.users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    last_accessed_at timestamptz,
    last_password_rotation_at timestamptz not null default now()
);

alter table public.client_sql_credentials add column if not exists company_name text;
alter table public.client_sql_credentials alter column client_id drop not null;
alter table public.client_sql_credentials drop column if exists host;
alter table public.client_sql_credentials drop column if exists port;
alter table public.client_sql_credentials drop column if exists is_active;

do $$
begin
    if to_regclass('public.clients') is not null then
        update public.client_sql_credentials csc
        set company_name = c.client_name
        from public.clients c
        where csc.client_id = c.id
          and (csc.company_name is null or length(trim(csc.company_name)) = 0);
    end if;
end;
$$;

update public.client_sql_credentials
set company_name = 'EMPRESA-' || left(id::text, 8)
where company_name is null or length(trim(company_name)) = 0;

alter table public.client_sql_credentials alter column company_name set not null;

create index if not exists idx_client_sql_credentials_client_id on public.client_sql_credentials(client_id);
create unique index if not exists idx_client_sql_credentials_company_name_uniq on public.client_sql_credentials (lower(company_name));

create table if not exists public.sql_credentials_audit_logs (
    id uuid primary key default gen_random_uuid(),
    credential_id uuid references public.client_sql_credentials(id) on delete set null,
    client_id uuid,
    company_name text,
    actor_user_id uuid references public.users(id) on delete set null,
    action text not null,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

alter table public.sql_credentials_audit_logs add column if not exists company_name text;

create index if not exists idx_sql_credentials_audit_logs_created_at on public.sql_credentials_audit_logs(created_at desc);
create index if not exists idx_sql_credentials_audit_logs_actor on public.sql_credentials_audit_logs(actor_user_id);
create index if not exists idx_sql_credentials_audit_logs_action on public.sql_credentials_audit_logs(action);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_client_sql_credentials_updated_at on public.client_sql_credentials;
create trigger trg_client_sql_credentials_updated_at
before update on public.client_sql_credentials
for each row execute function public.set_updated_at();

create or replace function public.resolve_sql_vault_role(p_user_id uuid default auth.uid())
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    v_role text;
begin
    select upper(trim(u.role))
    into v_role
    from public.users u
    where u.id = p_user_id
    limit 1;

    if v_role is null or length(v_role) = 0 then
        v_role := upper(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '')));
    end if;

    if v_role is null or length(v_role) = 0 then
        return null;
    end if;

    return v_role;
end;
$$;

create or replace function public.is_sql_vault_authorized(p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select coalesce(public.resolve_sql_vault_role(p_user_id), '') in ('ADMIN', 'TECH', 'SOPORTE');
$$;

create or replace function public.is_sql_vault_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select coalesce(public.resolve_sql_vault_role(p_user_id), '') = 'ADMIN';
$$;

create or replace function public.require_sql_vault_key()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    v_key text;
begin
    -- Backward-compatible: if DB setting exists, use it first.
    v_key := current_setting('app.settings.sql_vault_key', true);

    if v_key is null or length(trim(v_key)) = 0 then
        select svc.encryption_key
        into v_key
        from public.sql_vault_config svc
        where svc.id = true;
    end if;

    if v_key is null or length(trim(v_key)) = 0 then
        raise exception 'SQL vault key is not configured (sql_vault_config)';
    end if;

    return v_key;
end;
$$;

drop function if exists public.log_sql_vault_action(uuid, uuid, text, jsonb);
create or replace function public.log_sql_vault_action(
    p_credential_id uuid,
    p_company_name text,
    p_action text,
    p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
    insert into public.sql_credentials_audit_logs (
        credential_id,
        client_id,
        company_name,
        actor_user_id,
        action,
        metadata
    )
    values (
        p_credential_id,
        null,
        p_company_name,
        auth.uid(),
        p_action,
        coalesce(p_metadata, '{}'::jsonb)
    );
$$;

drop function if exists public.upsert_client_sql_credential(uuid, text, text, text, text);
drop function if exists public.upsert_client_sql_credential(uuid, text, text, text, text, integer, text, boolean);
drop function if exists public.upsert_client_sql_credential(text, text, text, text, text);
create or replace function public.upsert_client_sql_credential(
    p_company_name text,
    p_sql_username text,
    p_database_name text,
    p_plain_password text default null,
    p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_existing_id uuid;
    v_key text;
    v_encrypted bytea;
begin
    if not public.is_sql_vault_authorized(auth.uid()) then
        raise exception 'Not authorized for SQL vault';
    end if;

    if p_company_name is null or length(trim(p_company_name)) = 0 then
        raise exception 'Company name is required';
    end if;

    v_key := public.require_sql_vault_key();

    if p_plain_password is not null and length(trim(p_plain_password)) > 0 then
        v_encrypted := extensions.pgp_sym_encrypt(p_plain_password, v_key, 'cipher-algo=aes256');
    end if;

    select csc.id
    into v_existing_id
    from public.client_sql_credentials csc
    where lower(trim(csc.company_name)) = lower(trim(p_company_name))
    limit 1;

    if v_existing_id is null then
        if v_encrypted is null then
            raise exception 'Password is required when creating SQL credential';
        end if;

        insert into public.client_sql_credentials (
            client_id,
            company_name,
            sql_username,
            encrypted_password,
            db_name,
            notes,
            created_by,
            updated_by,
            last_password_rotation_at
        ) values (
            null,
            trim(p_company_name),
            p_sql_username,
            v_encrypted,
            p_database_name,
            p_notes,
            auth.uid(),
            auth.uid(),
            now()
        )
        returning id into v_existing_id;

        perform public.log_sql_vault_action(
            v_existing_id,
            trim(p_company_name),
            'CREATE_CREDENTIAL',
            jsonb_build_object('sql_username', p_sql_username, 'db_name', p_database_name)
        );
    else
        update public.client_sql_credentials
        set company_name = trim(p_company_name),
            sql_username = p_sql_username,
            db_name = p_database_name,
            notes = p_notes,
            encrypted_password = coalesce(v_encrypted, encrypted_password),
            last_password_rotation_at = case when v_encrypted is not null then now() else last_password_rotation_at end,
            updated_by = auth.uid()
        where id = v_existing_id;

        perform public.log_sql_vault_action(
            v_existing_id,
            trim(p_company_name),
            case when v_encrypted is null then 'UPDATE_CREDENTIAL' else 'ROTATE_PASSWORD' end,
            jsonb_build_object('sql_username', p_sql_username, 'db_name', p_database_name)
        );
    end if;

    return v_existing_id;
end;
$$;

drop function if exists public.reveal_client_sql_password(uuid);
create or replace function public.reveal_client_sql_password(
    p_credential_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    v_key text;
    v_password text;
    v_company_name text;
begin
    if not public.is_sql_vault_authorized(auth.uid()) then
        raise exception 'Not authorized for SQL vault';
    end if;

    v_key := public.require_sql_vault_key();

        select c.company_name,
            extensions.pgp_sym_decrypt(c.encrypted_password, v_key)
    into v_company_name, v_password
    from public.client_sql_credentials c
    where c.id = p_credential_id;

    if v_password is null then
        raise exception 'Credential not found';
    end if;

    update public.client_sql_credentials
    set last_accessed_at = now(),
        updated_by = auth.uid()
    where id = p_credential_id;

    perform public.log_sql_vault_action(
        p_credential_id,
        v_company_name,
        'REVEAL_PASSWORD',
        '{}'::jsonb
    );

    return v_password;
end;
$$;

drop function if exists public.delete_client_sql_credential(uuid);
create or replace function public.delete_client_sql_credential(
    p_credential_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_company_name text;
begin
    if not public.is_sql_vault_admin(auth.uid()) then
        raise exception 'Only ADMIN can delete SQL credentials';
    end if;

    select company_name into v_company_name
    from public.client_sql_credentials
    where id = p_credential_id;

    if v_company_name is null then
        return false;
    end if;

    -- Log before delete to satisfy FK constraint on credential_id.
    perform public.log_sql_vault_action(
        p_credential_id,
        v_company_name,
        'DELETE_CREDENTIAL',
        '{}'::jsonb
    );

    delete from public.client_sql_credentials
    where id = p_credential_id;

    return true;
end;
$$;

drop view if exists public.client_sql_credentials_view;
create view public.client_sql_credentials_view as
select
    csc.id,
    csc.company_name,
    csc.db_name,
    csc.sql_username,
    csc.notes,
    csc.updated_at,
    csc.last_accessed_at,
    csc.last_password_rotation_at
from public.client_sql_credentials csc;

alter table public.client_sql_credentials enable row level security;
alter table public.sql_credentials_audit_logs enable row level security;

drop policy if exists csc_select_policy on public.client_sql_credentials;
create policy csc_select_policy on public.client_sql_credentials
for select using (public.is_sql_vault_authorized(auth.uid()));

drop policy if exists csc_insert_policy on public.client_sql_credentials;
create policy csc_insert_policy on public.client_sql_credentials
for insert with check (public.is_sql_vault_authorized(auth.uid()));

drop policy if exists csc_update_policy on public.client_sql_credentials;
create policy csc_update_policy on public.client_sql_credentials
for update using (public.is_sql_vault_authorized(auth.uid()))
with check (public.is_sql_vault_authorized(auth.uid()));

drop policy if exists csc_delete_policy on public.client_sql_credentials;
create policy csc_delete_policy on public.client_sql_credentials
for delete using (public.is_sql_vault_admin(auth.uid()));

drop policy if exists sql_audit_select_policy on public.sql_credentials_audit_logs;
create policy sql_audit_select_policy on public.sql_credentials_audit_logs
for select using (
    exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'ADMIN'
    )
);

revoke all on public.sql_vault_config from public;
revoke all on public.sql_vault_config from anon;
revoke all on public.sql_vault_config from authenticated;

grant select on public.client_sql_credentials_view to authenticated;
grant execute on function public.resolve_sql_vault_role(uuid) to authenticated;
grant execute on function public.is_sql_vault_authorized(uuid) to authenticated;
grant execute on function public.is_sql_vault_admin(uuid) to authenticated;
grant execute on function public.upsert_client_sql_credential(text, text, text, text, text) to authenticated;
grant execute on function public.reveal_client_sql_password(uuid) to authenticated;
grant execute on function public.delete_client_sql_credential(uuid) to authenticated;

commit;
