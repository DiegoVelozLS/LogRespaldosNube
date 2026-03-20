-- Fix: Remove SQL Vault 2FA Requirement
-- This script reverts the vault functions to their non-2FA versions.
-- Run this in your Supabase SQL Editor to fix the "daily verification required" error.

begin;

-- 1. Helper to check if authorized (standard roles)
create or replace function public.is_sql_vault_authorized(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1 from public.users
        where id = p_user_id 
          and role in ('ADMIN', 'TECH', 'SOPORTE')
    );
$$;

-- 2. Upsert Function without 2FA
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
            company_name,
            sql_username,
            encrypted_password,
            db_name,
            notes,
            created_by,
            updated_by,
            last_password_rotation_at
        ) values (
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

        perform public.log_sql_vault_action(v_existing_id, trim(p_company_name), 'CREATE_CREDENTIAL');
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

        perform public.log_sql_vault_action(v_existing_id, trim(p_company_name), 'UPDATE_CREDENTIAL');
    end if;

    return v_existing_id;
end;
$$;

-- 3. Reveal Function without 2FA
create or replace function public.reveal_client_sql_password(p_credential_id uuid)
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

    select c.company_name, extensions.pgp_sym_decrypt(c.encrypted_password, v_key)
    into v_company_name, v_password
    from public.client_sql_credentials c
    where c.id = p_credential_id;

    if v_password is null then
        raise exception 'Credential not found';
    end if;

    update public.client_sql_credentials
    set last_accessed_at = now(), updated_by = auth.uid()
    where id = p_credential_id;

    perform public.log_sql_vault_action(p_credential_id, v_company_name, 'REVEAL_PASSWORD');

    return v_password;
end;
$$;

-- 4. Delete Function without 2FA
create or replace function public.delete_client_sql_credential(p_credential_id uuid)
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

    delete from public.client_sql_credentials where id = p_credential_id;

    perform public.log_sql_vault_action(p_credential_id, v_company_name, 'DELETE_CREDENTIAL');

    return true;
end;
$$;

-- 5. Cleanup OTP table and functions if they exist
drop table if exists public.vault_otps cascade;
drop function if exists public.is_vault_verified(uuid);
drop function if exists public.request_vault_otp();
drop function if exists public.verify_vault_otp(text);

commit;
