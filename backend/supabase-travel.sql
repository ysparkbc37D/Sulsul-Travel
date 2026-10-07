-- 술술트래블 공동 계획 서버. Supabase SQL Editor에서 프로젝트 소유자가 실행한다.
-- private 스키마는 Data API의 Exposed schemas에 추가하지 않는다.
begin;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
do $$ begin
  if exists (select 1 from pg_catalog.pg_extension e join pg_catalog.pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto' and n.nspname<>'extensions') then
    raise exception 'PGCRYPTO_SCHEMA_MISMATCH: pgcrypto의 설치 스키마를 확인한 뒤 SQL의 extensions.digest/gen_random_bytes 참조를 맞추세요.';
  end if;
end $$;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.travel_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  body jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.travel_memberships (
  document_id uuid not null references public.travel_documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  display_name text not null default '' check (length(display_name) <= 40),
  joined_at timestamptz not null default now(),
  primary key (document_id,user_id)
);
create index if not exists travel_memberships_user_idx on public.travel_memberships(user_id,document_id);
create table if not exists public.travel_invites (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.travel_documents(id) on delete cascade,
  token_hash bytea not null unique,
  role text not null check (role in ('viewer','editor')),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade
);
create index if not exists travel_invites_document_idx on public.travel_invites(document_id);
create table if not exists public.travel_changes (
  document_id uuid not null references public.travel_documents(id) on delete cascade,
  revision bigint not null,
  actor_id uuid not null references auth.users(id),
  summary text not null default '' check (length(summary) <= 120),
  body jsonb not null,
  mutation_id uuid,
  created_at timestamptz not null default now(),
  primary key (document_id,revision),
  unique (document_id,mutation_id)
);

-- 호출자 자신의 멤버십만 조회하는 정책 보조 함수. RLS 재귀를 피한다.
create or replace function private.travel_has_role(p_document_id uuid,p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.travel_memberships m
    where m.document_id=p_document_id and m.user_id=auth.uid() and m.role=any(p_roles)
  );
$$;
revoke all on function private.travel_has_role(uuid,text[]) from public, anon;
grant execute on function private.travel_has_role(uuid,text[]) to authenticated;

alter table public.travel_documents enable row level security;
alter table public.travel_memberships enable row level security;
alter table public.travel_invites enable row level security;
alter table public.travel_changes enable row level security;
revoke all on public.travel_documents,public.travel_memberships,public.travel_invites,public.travel_changes from public,anon,authenticated;
grant select (id,body,revision,updated_at,created_at) on public.travel_documents to authenticated;
grant select (document_id,user_id,role,display_name,joined_at) on public.travel_memberships to authenticated;
-- 토큰 해시는 프로젝트 소유자 외에는 직접 읽지 못한다.
grant select (id,document_id,role,expires_at,revoked_at,created_at) on public.travel_invites to authenticated;
grant select (document_id,revision,actor_id,summary,created_at) on public.travel_changes to authenticated;
drop policy if exists travel_documents_read on public.travel_documents;
create policy travel_documents_read on public.travel_documents for select to authenticated
using (private.travel_has_role(id,array['owner','editor','viewer']));
drop policy if exists travel_memberships_read on public.travel_memberships;
create policy travel_memberships_read on public.travel_memberships for select to authenticated
using (private.travel_has_role(document_id,array['owner','editor','viewer']));
drop policy if exists travel_invites_read on public.travel_invites;
create policy travel_invites_read on public.travel_invites for select to authenticated
using (private.travel_has_role(document_id,array['owner']));
drop policy if exists travel_changes_read on public.travel_changes;
create policy travel_changes_read on public.travel_changes for select to authenticated
using (private.travel_has_role(document_id,array['owner','editor','viewer']));

-- 브라우저를 우회한 RPC에도 개인 기록·이미지·인증 필드를 저장하지 않는다.
create or replace function private.travel_private_field(p_key text)
returns boolean language sql immutable set search_path = '' as $$
  select regexp_replace(lower(p_key),'[^a-z0-9]','','g') ~
    '^(journals?|journalentries|journaltext|diaries|diaryentries|diarytext|activityrecords|momentrecords|momententries|recordid|originaltext|expenses?|exchanges?|wallets?|initialbalances|activecurrencies|apikey|geminikey|githubpat|pat|password|accesstoken|refreshtoken|authorization|credentials?|secret|token)$'
    or regexp_replace(lower(p_key),'[^a-z0-9]','','g') ~ '(photo|thumbnail|mediaid|apikey|geminikey|githubpat|password|secret|credential|accesstoken|refreshtoken|authorization)|token$';
$$;
create or replace function private.travel_redact(p_value jsonb,p_depth integer default 0)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare result jsonb; item record;
begin
  if p_depth > 30 then raise exception 'INVALID_PLAN' using errcode='22023'; end if;
  if jsonb_typeof(p_value)='object' then
    result:='{}'::jsonb;
    for item in select key,value from jsonb_each(p_value) loop
      if not private.travel_private_field(item.key) then
        if item.key in ('__proto__','prototype','constructor') then raise exception 'INVALID_PLAN' using errcode='22023'; end if;
        result:=result || jsonb_build_object(item.key,private.travel_redact(item.value,p_depth+1));
      end if;
    end loop;
    return result;
  elsif jsonb_typeof(p_value)='array' then
    select coalesce(jsonb_agg(private.travel_redact(value,p_depth+1) order by ordinal),'[]'::jsonb) into result from jsonb_array_elements(p_value) with ordinality as a(value,ordinal);
    return result;
  end if;
  return p_value;
end;
$$;
create or replace function private.travel_plan(p_body jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare result jsonb; day jsonb; spot jsonb;
begin
  if p_body is null or jsonb_typeof(p_body) <> 'object' or octet_length(p_body::text)>1048576 then raise exception 'INVALID_PLAN' using errcode='22023'; end if;
  select coalesce(jsonb_object_agg(key,private.travel_redact(value)),'{}'::jsonb) into result
  from jsonb_each(p_body) where key=any(array[
    'id','title','subtitle','style','startDate','endDate','durationDays','arrivalTime','departureTime',
    'currency','budget','countries','cities','coverEmoji','concepts','wishlist','hubAllocations',
    'planSource','isBucketlist','status','days','planBlockMeta','checklist','timeZone']);
  if jsonb_typeof(result->'title') is distinct from 'string' or length(btrim(result->>'title'))=0 or length(result->>'title')>500
     or jsonb_typeof(result->'days') is distinct from 'array' or jsonb_array_length(result->'days')>730 then raise exception 'INVALID_PLAN' using errcode='22023'; end if;
  for day in select value from jsonb_array_elements(result->'days') loop
    if jsonb_typeof(day) is distinct from 'object' or jsonb_typeof(day->'spots') is distinct from 'array' or jsonb_array_length(day->'spots')>500 then raise exception 'INVALID_PLAN' using errcode='22023'; end if;
    for spot in select value from jsonb_array_elements(day->'spots') loop
      if jsonb_typeof(spot) is distinct from 'object' or (jsonb_typeof(spot->'title') is distinct from 'string' and jsonb_typeof(spot->'name') is distinct from 'string') then raise exception 'INVALID_PLAN' using errcode='22023'; end if;
    end loop;
  end loop;
  return result;
end;
$$;
revoke all on function private.travel_private_field(text),private.travel_redact(jsonb,integer),private.travel_plan(jsonb) from public,anon,authenticated;

create or replace function private.travel_create_document(p_body jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare document_id uuid; safe_body jsonb; caller uuid:=auth.uid();
begin
  if caller is null then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  safe_body:=private.travel_plan(p_body);
  insert into public.travel_documents(owner_id,body) values (caller,safe_body) returning id into document_id;
  insert into public.travel_memberships(document_id,user_id,role,display_name)
    values (document_id,caller,'owner',left(coalesce(auth.jwt()->'user_metadata'->>'display_name',''),40));
  insert into public.travel_changes(document_id,revision,actor_id,summary,body) values (document_id,1,caller,'공동 계획 게시',safe_body);
  return jsonb_build_object('document_id',document_id,'revision',1,'role','owner');
end;
$$;
create or replace function private.travel_update_document(p_document_id uuid,p_expected_revision bigint,p_body jsonb,p_summary text,p_mutation_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_revision bigint; prior_revision bigint; safe_body jsonb;
begin
  if not private.travel_has_role(p_document_id,array['owner','editor']) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_expected_revision is null or p_expected_revision<1 or p_mutation_id is null then raise exception 'INVALID_REVISION' using errcode='22023'; end if;
  select revision into current_revision from public.travel_documents where id=p_document_id for update;
  if not private.travel_has_role(p_document_id,array['owner','editor']) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select revision into prior_revision from public.travel_changes where document_id=p_document_id and mutation_id=p_mutation_id;
  if prior_revision is not null then return jsonb_build_object('status','duplicate','revision',current_revision,'applied_revision',prior_revision); end if;
  if current_revision <> p_expected_revision then return jsonb_build_object('status','conflict','revision',current_revision); end if;
  safe_body:=private.travel_plan(p_body);
  current_revision:=current_revision+1;
  update public.travel_documents set body=safe_body,revision=current_revision,updated_at=now() where id=p_document_id;
  insert into public.travel_changes(document_id,revision,actor_id,summary,body,mutation_id)
    values (p_document_id,current_revision,auth.uid(),left(coalesce(p_summary,'일정 수정'),120),safe_body,p_mutation_id);
  return jsonb_build_object('status','applied','revision',current_revision);
end;
$$;
create or replace function private.travel_create_invite(p_document_id uuid,p_role text,p_expires_days integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare invite_token text; invite_id uuid; expiry timestamptz;
begin
  if not private.travel_has_role(p_document_id,array['owner']) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_role is null or p_role not in ('viewer','editor') or p_expires_days is null or p_expires_days not in (1,7,30) then raise exception 'INVALID_INVITE' using errcode='22023'; end if;
  invite_token:=rtrim(translate(encode(extensions.gen_random_bytes(24),'base64'),'+/','-_'),'=');
  expiry:=now()+make_interval(days=>p_expires_days);
  insert into public.travel_invites(document_id,token_hash,role,expires_at,created_by)
    values (p_document_id,extensions.digest(invite_token,'sha256'),p_role,expiry,auth.uid()) returning id into invite_id;
  return jsonb_build_object('id',invite_id,'token',invite_token,'role',p_role,'expires_at',expiry);
end;
$$;
create or replace function private.travel_accept_invite(p_token text,p_display_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare invitation public.travel_invites%rowtype; actual_role text; current_revision bigint;
begin
  if auth.uid() is null then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{32}$' then raise exception 'INVALID_INVITE' using errcode='22023'; end if;
  select * into invitation from public.travel_invites where token_hash=extensions.digest(p_token,'sha256') for update;
  if invitation.id is null or invitation.revoked_at is not null or invitation.expires_at<=now() then raise exception 'INVALID_INVITE' using errcode='22023'; end if;
  insert into public.travel_memberships(document_id,user_id,role,display_name)
    values (invitation.document_id,auth.uid(),invitation.role,left(coalesce(p_display_name,''),40))
    on conflict (document_id,user_id) do update
      set role=case when travel_memberships.role in ('owner','editor') then travel_memberships.role else excluded.role end,
          display_name=case when excluded.display_name='' then travel_memberships.display_name else excluded.display_name end;
  select role into actual_role from public.travel_memberships where document_id=invitation.document_id and user_id=auth.uid();
  select revision into current_revision from public.travel_documents where id=invitation.document_id;
  return jsonb_build_object('document_id',invitation.document_id,'revision',current_revision,'role',actual_role);
end;
$$;
create or replace function private.travel_revoke_invite(p_invite_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare document_id uuid;
begin
  select i.document_id into document_id from public.travel_invites i where i.id=p_invite_id;
  if not private.travel_has_role(document_id,array['owner']) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  update public.travel_invites set revoked_at=coalesce(revoked_at,now()) where id=p_invite_id;
  return jsonb_build_object('status','revoked');
end;
$$;
create or replace function private.travel_remove_member(p_document_id uuid,p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.travel_has_role(p_document_id,array['owner']) or p_user_id is null or p_user_id=auth.uid() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  perform 1 from public.travel_documents where id=p_document_id for update;
  delete from public.travel_memberships where document_id=p_document_id and user_id=p_user_id and role<>'owner';
  return jsonb_build_object('status','removed');
end;
$$;

-- Data API에는 invoker 래퍼만 공개한다. 관리 처리는 비공개 스키마에서 권한을 확인한다.
create or replace function public.travel_create_document(p_body jsonb)
returns jsonb language sql security invoker set search_path = '' as $$ select private.travel_create_document(p_body); $$;
create or replace function public.travel_update_document(p_document_id uuid,p_expected_revision bigint,p_body jsonb,p_summary text,p_mutation_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$ select private.travel_update_document(p_document_id,p_expected_revision,p_body,p_summary,p_mutation_id); $$;
create or replace function public.travel_create_invite(p_document_id uuid,p_role text,p_expires_days integer)
returns jsonb language sql security invoker set search_path = '' as $$ select private.travel_create_invite(p_document_id,p_role,p_expires_days); $$;
create or replace function public.travel_accept_invite(p_token text,p_display_name text)
returns jsonb language sql security invoker set search_path = '' as $$ select private.travel_accept_invite(p_token,p_display_name); $$;
create or replace function public.travel_revoke_invite(p_invite_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$ select private.travel_revoke_invite(p_invite_id); $$;
create or replace function public.travel_remove_member(p_document_id uuid,p_user_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$ select private.travel_remove_member(p_document_id,p_user_id); $$;

-- 새 함수의 기본 PUBLIC EXECUTE를 반드시 제거한다.
revoke all on function private.travel_create_document(jsonb),private.travel_update_document(uuid,bigint,jsonb,text,uuid),private.travel_create_invite(uuid,text,integer),private.travel_accept_invite(text,text),private.travel_revoke_invite(uuid),private.travel_remove_member(uuid,uuid) from public,anon;
grant execute on function private.travel_create_document(jsonb),private.travel_update_document(uuid,bigint,jsonb,text,uuid),private.travel_create_invite(uuid,text,integer),private.travel_accept_invite(text,text),private.travel_revoke_invite(uuid),private.travel_remove_member(uuid,uuid) to authenticated;
revoke all on function public.travel_create_document(jsonb),public.travel_update_document(uuid,bigint,jsonb,text,uuid),public.travel_create_invite(uuid,text,integer),public.travel_accept_invite(text,text),public.travel_revoke_invite(uuid),public.travel_remove_member(uuid,uuid) from public,anon;
grant execute on function public.travel_create_document(jsonb),public.travel_update_document(uuid,bigint,jsonb,text,uuid),public.travel_create_invite(uuid,text,integer),public.travel_accept_invite(text,text),public.travel_revoke_invite(uuid),public.travel_remove_member(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
