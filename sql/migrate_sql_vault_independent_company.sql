-- Migration: decouple SQL vault from clients directory
-- Goal: SQL vault works with independent company name (no clients dependency)

begin;

create table if not exists public.sql_vault_config (
    id boolean primary key default true,
    encryption_key text not null,
    updated_at timestamptz not null default now(),
    check (id = true)
);

-- 1) Schema changes
alter table public.client_sql_credentials
    add column if not exists company_name text;

alter table public.sql_credentials_audit_logs
    add column if not exists company_name text;

-- Allow legacy rows while we backfill and move away from clients table
alter table public.client_sql_credentials
    alter column client_id drop not null;

-- 2) Backfill company name from clients for existing data
update public.client_sql_credentials csc
set company_name = c.client_name
from public.clients c
where csc.client_id = c.id
  and (csc.company_name is null or length(trim(csc.company_name)) = 0);

-- Fallback for any row without company name
update public.client_sql_credentials
set company_name = 'EMPRESA-' || left(id::text, 8)
where company_name is null or length(trim(company_name)) = 0;

-- Make it required from now on
alter table public.client_sql_credentials
    alter column company_name set not null;

create index if not exists idx_client_sql_credentials_company_name
    on public.client_sql_credentials (lower(company_name));

-- 3) Replace helper log function to use company_name
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

-- 4) Replace upsert function with company-based version
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

-- 5) Replace reveal/delete to log by company_name
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
    if not public.is_sql_vault_authorized(auth.uid()) then
        raise exception 'Not authorized for SQL vault';
    end if;

    select company_name into v_company_name
    from public.client_sql_credentials
    where id = p_credential_id;

    if v_company_name is null then
        return false;
    end if;

    delete from public.client_sql_credentials
    where id = p_credential_id;

    perform public.log_sql_vault_action(
        p_credential_id,
        v_company_name,
        'DELETE_CREDENTIAL',
        '{}'::jsonb
    );

    return true;
end;
$$;

-- 6) View aligned to new model
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

-- 7) Grants
grant select on public.client_sql_credentials_view to authenticated;
grant execute on function public.upsert_client_sql_credential(text, text, text, text, text) to authenticated;
grant execute on function public.reveal_client_sql_password(uuid) to authenticated;
grant execute on function public.delete_client_sql_credential(uuid) to authenticated;
grant execute on function public.log_sql_vault_action(uuid, text, text, jsonb) to authenticated;

commit;
