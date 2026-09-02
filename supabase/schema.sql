-- hnotlar - Supabase veritabani semasi
-- Bu dosyayi Supabase Dashboard > SQL Editor icine yapistirip calistir.

create extension if not exists pgcrypto with schema extensions;

-- ============================================================
-- FIRMALAR
-- ============================================================
create table if not exists firmalar (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- KULLANICILAR (admin / patron / personel / firma)
-- ============================================================
create table if not exists kullanicilar (
  id uuid primary key default gen_random_uuid(),
  kullanici_adi text not null unique,
  sifre_hash text not null,
  ad_soyad text not null,
  rol text not null check (rol in ('admin', 'patron', 'personel', 'firma')),
  firma_id uuid references firmalar(id) on delete set null,
  aciklama text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

alter table kullanicilar add column if not exists aciklama text;

-- ============================================================
-- OTURUMLAR (giris sonrasi verilen oturum token'i)
-- ============================================================
create table if not exists oturumlar (
  id uuid primary key default gen_random_uuid(),
  kullanici_id uuid not null references kullanicilar(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  son_kullanim timestamptz not null default now()
);

-- ============================================================
-- PROJELER
-- ============================================================
create table if not exists projeler (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  aciklama text,
  olusturan_id uuid not null references kullanicilar(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- PROJE_KULLANICILARI (bir proje birden fazla kullaniciya atanabilir)
-- ============================================================
create table if not exists proje_kullanicilari (
  id uuid primary key default gen_random_uuid(),
  proje_id uuid not null references projeler(id) on delete cascade,
  kullanici_id uuid not null references kullanicilar(id) on delete cascade,
  atanma_tarihi timestamptz not null default now(),
  unique (proje_id, kullanici_id)
);

-- ============================================================
-- REVIZYONLAR (proje icinde gonderilen revize/yenilik basliklari)
-- ============================================================
create table if not exists revizyonlar (
  id uuid primary key default gen_random_uuid(),
  proje_id uuid not null references projeler(id) on delete cascade,
  baslik text not null,
  aciklama text,
  yayinda boolean not null default false,
  olusturan_id uuid not null references kullanicilar(id),
  created_at timestamptz not null default now()
);

alter table revizyonlar add column if not exists yayinda boolean not null default false;

-- ============================================================
-- MADDELER (bir revizyon icinde sinirsiz sayida madde)
-- ============================================================
create table if not exists maddeler (
  id uuid primary key default gen_random_uuid(),
  revizyon_id uuid not null references revizyonlar(id) on delete cascade,
  baslik text,
  metin text not null,
  sira integer not null default 0,
  created_at timestamptz not null default now()
);

alter table maddeler add column if not exists baslik text;

-- ============================================================
-- MADDE_MEDYA (maddeye ait ekstra metin / gorsel / video)
-- ============================================================
create table if not exists madde_medya (
  id uuid primary key default gen_random_uuid(),
  madde_id uuid not null references maddeler(id) on delete cascade,
  medya_url text not null,
  medya_tipi text not null check (medya_tipi in ('metin', 'gorsel', 'video')),
  sira integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- MADDE_DURUMLARI (her kullanici kendi maddesini ayri isaretler)
-- ============================================================
create table if not exists madde_durumlari (
  id uuid primary key default gen_random_uuid(),
  madde_id uuid not null references maddeler(id) on delete cascade,
  kullanici_id uuid not null references kullanicilar(id) on delete cascade,
  yapildi boolean not null default false,
  yapildi_aciklama text,
  yapildi_tarihi timestamptz,
  unique (madde_id, kullanici_id)
);

-- ============================================================
-- MADDE_YORUMLARI (anlasilmayan maddelere geri bildirim / soru-cevap)
-- ============================================================
create table if not exists madde_yorumlari (
  id uuid primary key default gen_random_uuid(),
  madde_id uuid not null references maddeler(id) on delete cascade,
  kullanici_id uuid not null references kullanicilar(id),
  yorum text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- REVIZYON_DURUMLARI (her kullanici bir revizyonu komple tamamlandi diye isaretler)
-- ============================================================
create table if not exists revizyon_durumlari (
  id uuid primary key default gen_random_uuid(),
  revizyon_id uuid not null references revizyonlar(id) on delete cascade,
  kullanici_id uuid not null references kullanicilar(id) on delete cascade,
  yapildi boolean not null default false,
  yapildi_tarihi timestamptz,
  unique (revizyon_id, kullanici_id)
);

create index if not exists proje_kullanicilari_proje_idx on proje_kullanicilari(proje_id);
create index if not exists proje_kullanicilari_kullanici_idx on proje_kullanicilari(kullanici_id);
create index if not exists revizyonlar_proje_idx on revizyonlar(proje_id);
create index if not exists maddeler_revizyon_idx on maddeler(revizyon_id, sira);
create index if not exists madde_medya_madde_idx on madde_medya(madde_id, sira);
create index if not exists madde_durumlari_madde_idx on madde_durumlari(madde_id);
create index if not exists madde_durumlari_kullanici_idx on madde_durumlari(kullanici_id);
create index if not exists madde_yorumlari_madde_idx on madde_yorumlari(madde_id, created_at);
create index if not exists revizyon_durumlari_revizyon_idx on revizyon_durumlari(revizyon_id);

-- ============================================================
-- MADDE_GORULME (admin bir maddeyi en son ne zaman gordu)
-- ============================================================
create table if not exists madde_gorulme (
  id uuid primary key default gen_random_uuid(),
  madde_id uuid not null references maddeler(id) on delete cascade,
  kullanici_id uuid not null references kullanicilar(id) on delete cascade,
  son_gorulme timestamptz not null default now(),
  unique (madde_id, kullanici_id)
);

create index if not exists madde_gorulme_madde_idx on madde_gorulme(madde_id);

-- ============================================================
-- RLS: tum tablolarda kapali erisim (varsayilan reddet)
-- Erisim sadece asagidaki security definer fonksiyonlar uzerinden.
-- ============================================================
alter table firmalar enable row level security;
alter table kullanicilar enable row level security;
alter table oturumlar enable row level security;
alter table projeler enable row level security;
alter table proje_kullanicilari enable row level security;
alter table revizyonlar enable row level security;
alter table maddeler enable row level security;
alter table madde_medya enable row level security;
alter table madde_durumlari enable row level security;
alter table madde_yorumlari enable row level security;
alter table revizyon_durumlari enable row level security;
alter table madde_gorulme enable row level security;

-- ============================================================
-- OTURUM DOGRULAMA (ic kullanim - anon'a acilmiyor)
-- ============================================================
create or replace function gecerli_kullanici(p_token text)
returns kullanicilar
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_kullanici kullanicilar%rowtype;
begin
  select k.* into v_kullanici
  from oturumlar o
  join kullanicilar k on k.id = o.kullanici_id
  where o.token = p_token and k.aktif = true;

  if not found then
    raise exception 'Gecersiz oturum';
  end if;

  update oturumlar set son_kullanim = now() where token = p_token;

  return v_kullanici;
end;
$$;

create or replace function gecerli_admin(p_token text)
returns kullanicilar
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_kullanici kullanicilar%rowtype;
begin
  v_kullanici := gecerli_kullanici(p_token);
  if v_kullanici.rol <> 'admin' then
    raise exception 'Yetkiniz yok';
  end if;
  return v_kullanici;
end;
$$;

create or replace function proje_erisim_var_mi(p_kullanici_id uuid, p_proje_id uuid, p_rol text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_rol = 'admin' then
    return true;
  end if;

  return exists (
    select 1 from proje_kullanicilari pk
    where pk.proje_id = p_proje_id and pk.kullanici_id = p_kullanici_id
  );
end;
$$;

create or replace function madde_bildirim_durumu(p_madde_id uuid, p_kullanici_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_son_gorulme timestamptz;
begin
  select mg.son_gorulme into v_son_gorulme
  from madde_gorulme mg
  where mg.madde_id = p_madde_id and mg.kullanici_id = p_kullanici_id;

  if v_son_gorulme is null then
    v_son_gorulme := '-infinity'::timestamptz;
  end if;

  if exists (
    select 1 from madde_yorumlari my
    where my.madde_id = p_madde_id and my.created_at > v_son_gorulme
  ) then
    return 'kirmizi';
  end if;

  if exists (
    select 1 from madde_durumlari md
    where md.madde_id = p_madde_id and md.yapildi = true and md.yapildi_tarihi > v_son_gorulme
  ) then
    return 'yesil';
  end if;

  return null;
end;
$$;

create or replace function madde_gorulme_isaretle(p_token text, p_madde_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin kullanicilar%rowtype;
begin
  v_admin := gecerli_admin(p_token);

  insert into madde_gorulme (madde_id, kullanici_id, son_gorulme)
  values (p_madde_id, v_admin.id, now())
  on conflict (madde_id, kullanici_id) do update set son_gorulme = now();
end;
$$;

revoke all on function madde_gorulme_isaretle(text, uuid) from public;
grant execute on function madde_gorulme_isaretle(text, uuid) to anon, authenticated;

-- ============================================================
-- GIRIS / CIKIS
-- ============================================================
drop function if exists giris_yap(text, text);

create or replace function giris_yap(p_kullanici_adi text, p_sifre text)
returns table (
  oturum_token text,
  id uuid,
  kullanici_adi text,
  ad_soyad text,
  rol text,
  firma_id uuid
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_kullanici kullanicilar%rowtype;
  v_token text;
begin
  select k.* into v_kullanici
  from kullanicilar k
  where k.kullanici_adi = p_kullanici_adi
    and k.aktif = true
    and k.sifre_hash = crypt(p_sifre, k.sifre_hash);

  if not found then
    return;
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into oturumlar (kullanici_id, token) values (v_kullanici.id, v_token);

  return query
  select v_token, v_kullanici.id, v_kullanici.kullanici_adi, v_kullanici.ad_soyad, v_kullanici.rol, v_kullanici.firma_id;
end;
$$;

revoke all on function giris_yap(text, text) from public;
grant execute on function giris_yap(text, text) to anon, authenticated;

create or replace function cikis_yap(p_token text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  delete from oturumlar where token = p_token;
end;
$$;

revoke all on function cikis_yap(text) from public;
grant execute on function cikis_yap(text) to anon, authenticated;

-- ============================================================
-- ADMIN: KULLANICI VE FIRMA YONETIMI
-- ============================================================
drop function if exists kullanici_ekle(text, text, text, text, text, uuid);

create or replace function kullanici_ekle(
  p_token text,
  p_kullanici_adi text,
  p_sifre text,
  p_ad_soyad text,
  p_rol text,
  p_firma_adi text default null,
  p_aciklama text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_firma_id uuid;
begin
  perform gecerli_admin(p_token);

  if p_firma_adi is not null and length(trim(p_firma_adi)) > 0 then
    select f.id into v_firma_id from firmalar f where f.ad = trim(p_firma_adi);
    if not found then
      insert into firmalar (ad) values (trim(p_firma_adi)) returning id into v_firma_id;
    end if;
  end if;

  insert into kullanicilar (kullanici_adi, sifre_hash, ad_soyad, rol, firma_id, aciklama)
  values (p_kullanici_adi, crypt(p_sifre, gen_salt('bf')), p_ad_soyad, p_rol, v_firma_id, p_aciklama)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function kullanici_ekle(text, text, text, text, text, text, text) from public;
grant execute on function kullanici_ekle(text, text, text, text, text, text, text) to anon, authenticated;

create or replace function firma_ekle(p_token text, p_ad text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  perform gecerli_admin(p_token);

  insert into firmalar (ad) values (p_ad) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function firma_ekle(text, text) from public;
grant execute on function firma_ekle(text, text) to anon, authenticated;

drop function if exists admin_kullanicilari_getir(text);

create or replace function admin_kullanicilari_getir(p_token text)
returns table (id uuid, kullanici_adi text, ad_soyad text, rol text, firma_id uuid, firma_adi text, aciklama text, aktif boolean)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform gecerli_admin(p_token);

  return query
  select k.id, k.kullanici_adi, k.ad_soyad, k.rol, k.firma_id, f.ad, k.aciklama, k.aktif
  from kullanicilar k
  left join firmalar f on f.id = k.firma_id
  order by k.created_at desc;
end;
$$;

revoke all on function admin_kullanicilari_getir(text) from public;
grant execute on function admin_kullanicilari_getir(text) to anon, authenticated;

create or replace function admin_firmalari_getir(p_token text)
returns table (id uuid, ad text)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform gecerli_admin(p_token);

  return query select f.id, f.ad from firmalar f order by f.ad;
end;
$$;

revoke all on function admin_firmalari_getir(text) from public;
grant execute on function admin_firmalari_getir(text) to anon, authenticated;

-- ============================================================
-- ADMIN: PROJE / REVIZYON / MADDE YONETIMI
-- ============================================================
create or replace function proje_olustur(p_token text, p_ad text, p_aciklama text default null)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin kullanicilar%rowtype;
  v_id uuid;
begin
  v_admin := gecerli_admin(p_token);

  insert into projeler (ad, aciklama, olusturan_id)
  values (p_ad, p_aciklama, v_admin.id)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function proje_olustur(text, text, text) from public;
grant execute on function proje_olustur(text, text, text) to anon, authenticated;

create or replace function proje_kullanici_ata(p_token text, p_proje_id uuid, p_kullanici_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform gecerli_admin(p_token);

  insert into proje_kullanicilari (proje_id, kullanici_id)
  values (p_proje_id, p_kullanici_id)
  on conflict (proje_id, kullanici_id) do nothing;
end;
$$;

revoke all on function proje_kullanici_ata(text, uuid, uuid) from public;
grant execute on function proje_kullanici_ata(text, uuid, uuid) to anon, authenticated;

create or replace function proje_kullanici_cikar(p_token text, p_proje_id uuid, p_kullanici_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform gecerli_admin(p_token);

  delete from proje_kullanicilari
  where proje_id = p_proje_id and kullanici_id = p_kullanici_id;
end;
$$;

revoke all on function proje_kullanici_cikar(text, uuid, uuid) from public;
grant execute on function proje_kullanici_cikar(text, uuid, uuid) to anon, authenticated;

create or replace function proje_guncelle(p_token text, p_proje_id uuid, p_ad text, p_aciklama text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform gecerli_admin(p_token);

  update projeler set ad = p_ad, aciklama = p_aciklama where id = p_proje_id;
end;
$$;

revoke all on function proje_guncelle(text, uuid, text, text) from public;
grant execute on function proje_guncelle(text, uuid, text, text) to anon, authenticated;

create or replace function proje_sil(p_token text, p_proje_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform gecerli_admin(p_token);

  delete from projeler where id = p_proje_id;
end;
$$;

revoke all on function proje_sil(text, uuid) from public;
grant execute on function proje_sil(text, uuid) to anon, authenticated;

create or replace function revizyon_olustur(p_token text, p_proje_id uuid, p_baslik text, p_aciklama text default null)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin kullanicilar%rowtype;
  v_id uuid;
begin
  v_admin := gecerli_admin(p_token);

  insert into revizyonlar (proje_id, baslik, aciklama, olusturan_id)
  values (p_proje_id, p_baslik, p_aciklama, v_admin.id)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function revizyon_olustur(text, uuid, text, text) from public;
grant execute on function revizyon_olustur(text, uuid, text, text) to anon, authenticated;

create or replace function revizyon_guncelle(p_token text, p_revizyon_id uuid, p_baslik text, p_aciklama text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform gecerli_admin(p_token);

  update revizyonlar set baslik = p_baslik, aciklama = p_aciklama where id = p_revizyon_id;
end;
$$;

revoke all on function revizyon_guncelle(text, uuid, text, text) from public;
grant execute on function revizyon_guncelle(text, uuid, text, text) to anon, authenticated;

create or replace function revizyon_yayinla(p_token text, p_revizyon_id uuid, p_yayinda boolean)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform gecerli_admin(p_token);

  update revizyonlar set yayinda = p_yayinda where id = p_revizyon_id;
end;
$$;

revoke all on function revizyon_yayinla(text, uuid, boolean) from public;
grant execute on function revizyon_yayinla(text, uuid, boolean) to anon, authenticated;

create or replace function revizyon_sil(p_token text, p_revizyon_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform gecerli_admin(p_token);

  delete from revizyonlar where id = p_revizyon_id;
end;
$$;

revoke all on function revizyon_sil(text, uuid) from public;
grant execute on function revizyon_sil(text, uuid) to anon, authenticated;

drop function if exists madde_ekle(text, uuid, text, integer);

create or replace function madde_ekle(p_token text, p_revizyon_id uuid, p_baslik text, p_metin text, p_sira integer default 0)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  perform gecerli_admin(p_token);

  insert into maddeler (revizyon_id, baslik, metin, sira)
  values (p_revizyon_id, p_baslik, p_metin, p_sira)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function madde_ekle(text, uuid, text, text, integer) from public;
grant execute on function madde_ekle(text, uuid, text, text, integer) to anon, authenticated;

create or replace function madde_guncelle(p_token text, p_madde_id uuid, p_baslik text, p_metin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform gecerli_admin(p_token);

  update maddeler set baslik = p_baslik, metin = p_metin where id = p_madde_id;
end;
$$;

revoke all on function madde_guncelle(text, uuid, text, text) from public;
grant execute on function madde_guncelle(text, uuid, text, text) to anon, authenticated;

create or replace function madde_sil(p_token text, p_madde_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform gecerli_admin(p_token);

  delete from maddeler where id = p_madde_id;
end;
$$;

revoke all on function madde_sil(text, uuid) from public;
grant execute on function madde_sil(text, uuid) to anon, authenticated;

create or replace function madde_medya_ekle(p_token text, p_madde_id uuid, p_medya_url text, p_medya_tipi text, p_sira integer default 0)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  perform gecerli_admin(p_token);

  insert into madde_medya (madde_id, medya_url, medya_tipi, sira)
  values (p_madde_id, p_medya_url, p_medya_tipi, p_sira)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function madde_medya_ekle(text, uuid, text, text, integer) from public;
grant execute on function madde_medya_ekle(text, uuid, text, text, integer) to anon, authenticated;

create or replace function madde_medya_sil(p_token text, p_medya_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform gecerli_admin(p_token);

  delete from madde_medya where id = p_medya_id;
end;
$$;

revoke all on function madde_medya_sil(text, uuid) from public;
grant execute on function madde_medya_sil(text, uuid) to anon, authenticated;

-- ============================================================
-- ADMIN: OKUMA / LISTELEME
-- ============================================================
drop function if exists admin_projeleri_getir(text);

create or replace function admin_projeleri_getir(p_token text)
returns table (id uuid, ad text, aciklama text, created_at timestamptz, kullanici_sayisi bigint, revizyon_sayisi bigint, bildirim text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin kullanicilar%rowtype;
begin
  v_admin := gecerli_admin(p_token);

  return query
  select
    p.id, p.ad, p.aciklama, p.created_at,
    (select count(*) from proje_kullanicilari pk where pk.proje_id = p.id),
    (select count(*) from revizyonlar r where r.proje_id = p.id),
    (select case
       when bool_or(madde_bildirim_durumu(m.id, v_admin.id) = 'kirmizi') then 'kirmizi'
       when bool_or(madde_bildirim_durumu(m.id, v_admin.id) = 'yesil') then 'yesil'
       else null
     end
     from maddeler m
     join revizyonlar r on r.id = m.revizyon_id
     where r.proje_id = p.id)
  from projeler p
  order by p.created_at desc;
end;
$$;

revoke all on function admin_projeleri_getir(text) from public;
grant execute on function admin_projeleri_getir(text) to anon, authenticated;

create or replace function admin_proje_kullanicilari_getir(p_token text, p_proje_id uuid)
returns table (kullanici_id uuid, kullanici_adi text, ad_soyad text, rol text)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform gecerli_admin(p_token);

  return query
  select k.id, k.kullanici_adi, k.ad_soyad, k.rol
  from proje_kullanicilari pk
  join kullanicilar k on k.id = pk.kullanici_id
  where pk.proje_id = p_proje_id
  order by k.ad_soyad;
end;
$$;

revoke all on function admin_proje_kullanicilari_getir(text, uuid) from public;
grant execute on function admin_proje_kullanicilari_getir(text, uuid) to anon, authenticated;

drop function if exists admin_revizyonlari_getir(text, uuid);

create or replace function admin_revizyonlari_getir(p_token text, p_proje_id uuid)
returns table (id uuid, baslik text, aciklama text, created_at timestamptz, madde_sayisi bigint, tamamlayanlar jsonb, yayinda boolean, bildirim text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin kullanicilar%rowtype;
begin
  v_admin := gecerli_admin(p_token);

  return query
  select r.id, r.baslik, r.aciklama, r.created_at,
    (select count(*) from maddeler m where m.revizyon_id = r.id),
    coalesce((select jsonb_agg(jsonb_build_object('kullanici_adi', k.kullanici_adi, 'yapildi', rd.yapildi, 'tarih', rd.yapildi_tarihi))
              from revizyon_durumlari rd join kullanicilar k on k.id = rd.kullanici_id where rd.revizyon_id = r.id), '[]'::jsonb),
    r.yayinda,
    (select case
       when bool_or(madde_bildirim_durumu(m.id, v_admin.id) = 'kirmizi') then 'kirmizi'
       when bool_or(madde_bildirim_durumu(m.id, v_admin.id) = 'yesil') then 'yesil'
       else null
     end
     from maddeler m
     where m.revizyon_id = r.id)
  from revizyonlar r
  where r.proje_id = p_proje_id
  order by r.created_at desc;
end;
$$;

revoke all on function admin_revizyonlari_getir(text, uuid) from public;
grant execute on function admin_revizyonlari_getir(text, uuid) to anon, authenticated;

drop function if exists admin_maddeleri_getir(text, uuid);

create or replace function admin_maddeleri_getir(p_token text, p_revizyon_id uuid)
returns table (id uuid, baslik text, metin text, sira integer, medya jsonb, durumlar jsonb, yorumlar jsonb, bildirim text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin kullanicilar%rowtype;
begin
  v_admin := gecerli_admin(p_token);

  return query
  select
    m.id,
    m.baslik,
    m.metin,
    m.sira,
    coalesce((select jsonb_agg(jsonb_build_object('id', mm.id, 'url', mm.medya_url, 'tip', mm.medya_tipi) order by mm.sira)
              from madde_medya mm where mm.madde_id = m.id), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('kullanici_adi', k.kullanici_adi, 'yapildi', md.yapildi, 'aciklama', md.yapildi_aciklama, 'tarih', md.yapildi_tarihi))
              from madde_durumlari md join kullanicilar k on k.id = md.kullanici_id where md.madde_id = m.id), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('kullanici_adi', k2.kullanici_adi, 'yorum', my.yorum, 'tarih', my.created_at) order by my.created_at)
              from madde_yorumlari my join kullanicilar k2 on k2.id = my.kullanici_id where my.madde_id = m.id), '[]'::jsonb),
    madde_bildirim_durumu(m.id, v_admin.id)
  from maddeler m
  where m.revizyon_id = p_revizyon_id
  order by m.sira;
end;
$$;

revoke all on function admin_maddeleri_getir(text, uuid) from public;
grant execute on function admin_maddeleri_getir(text, uuid) to anon, authenticated;

-- ============================================================
-- KULLANICI TARAFI (personel / firma / patron)
-- ============================================================
create or replace function kullanici_projelerini_getir(p_token text)
returns table (id uuid, ad text, aciklama text, created_at timestamptz, revizyon_sayisi bigint)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_kullanici kullanicilar%rowtype;
begin
  v_kullanici := gecerli_kullanici(p_token);

  return query
  select p.id, p.ad, p.aciklama, p.created_at,
    (select count(*) from revizyonlar r where r.proje_id = p.id)
  from projeler p
  join proje_kullanicilari pk on pk.proje_id = p.id
  where pk.kullanici_id = v_kullanici.id
  order by p.created_at desc;
end;
$$;

revoke all on function kullanici_projelerini_getir(text) from public;
grant execute on function kullanici_projelerini_getir(text) to anon, authenticated;

create or replace function kullanici_revizyonlari_getir(p_token text, p_proje_id uuid)
returns table (
  id uuid,
  baslik text,
  aciklama text,
  created_at timestamptz,
  madde_sayisi bigint,
  tamamlanan_madde_sayisi bigint,
  revizyon_tamamlandi boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_kullanici kullanicilar%rowtype;
begin
  v_kullanici := gecerli_kullanici(p_token);

  if not proje_erisim_var_mi(v_kullanici.id, p_proje_id, v_kullanici.rol) then
    raise exception 'Yetkiniz yok';
  end if;

  return query
  select
    r.id, r.baslik, r.aciklama, r.created_at,
    (select count(*) from maddeler m where m.revizyon_id = r.id),
    (select count(*) from maddeler m
       join madde_durumlari md on md.madde_id = m.id
       where m.revizyon_id = r.id and md.kullanici_id = v_kullanici.id and md.yapildi = true),
    coalesce((select rd.yapildi from revizyon_durumlari rd
                where rd.revizyon_id = r.id and rd.kullanici_id = v_kullanici.id), false)
  from revizyonlar r
  where r.proje_id = p_proje_id and r.yayinda = true
  order by r.created_at desc;
end;
$$;

revoke all on function kullanici_revizyonlari_getir(text, uuid) from public;
grant execute on function kullanici_revizyonlari_getir(text, uuid) to anon, authenticated;

drop function if exists kullanici_maddeleri_getir(text, uuid);

create or replace function kullanici_maddeleri_getir(p_token text, p_revizyon_id uuid)
returns table (id uuid, baslik text, metin text, sira integer, medya jsonb, benim_durumum jsonb, yorumlar jsonb)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_kullanici kullanicilar%rowtype;
  v_proje_id uuid;
begin
  v_kullanici := gecerli_kullanici(p_token);

  select r.proje_id into v_proje_id from revizyonlar r where r.id = p_revizyon_id;

  if not proje_erisim_var_mi(v_kullanici.id, v_proje_id, v_kullanici.rol) then
    raise exception 'Yetkiniz yok';
  end if;

  return query
  select
    m.id, m.baslik, m.metin, m.sira,
    coalesce((select jsonb_agg(jsonb_build_object('id', mm.id, 'url', mm.medya_url, 'tip', mm.medya_tipi) order by mm.sira)
              from madde_medya mm where mm.madde_id = m.id), '[]'::jsonb),
    coalesce((select jsonb_build_object('yapildi', md.yapildi, 'aciklama', md.yapildi_aciklama)
              from madde_durumlari md where md.madde_id = m.id and md.kullanici_id = v_kullanici.id),
              jsonb_build_object('yapildi', false, 'aciklama', null)),
    coalesce((select jsonb_agg(jsonb_build_object('kullanici_adi', k.kullanici_adi, 'yorum', my.yorum, 'tarih', my.created_at) order by my.created_at)
              from madde_yorumlari my join kullanicilar k on k.id = my.kullanici_id where my.madde_id = m.id), '[]'::jsonb)
  from maddeler m
  where m.revizyon_id = p_revizyon_id
  order by m.sira;
end;
$$;

revoke all on function kullanici_maddeleri_getir(text, uuid) from public;
grant execute on function kullanici_maddeleri_getir(text, uuid) to anon, authenticated;

create or replace function madde_isaretle(p_token text, p_madde_id uuid, p_yapildi boolean, p_aciklama text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_kullanici kullanicilar%rowtype;
  v_proje_id uuid;
begin
  v_kullanici := gecerli_kullanici(p_token);

  select r.proje_id into v_proje_id
  from maddeler m join revizyonlar r on r.id = m.revizyon_id
  where m.id = p_madde_id;

  if not proje_erisim_var_mi(v_kullanici.id, v_proje_id, v_kullanici.rol) then
    raise exception 'Yetkiniz yok';
  end if;

  insert into madde_durumlari (madde_id, kullanici_id, yapildi, yapildi_aciklama, yapildi_tarihi)
  values (p_madde_id, v_kullanici.id, p_yapildi, p_aciklama, case when p_yapildi then now() else null end)
  on conflict (madde_id, kullanici_id) do update
    set yapildi = excluded.yapildi,
        yapildi_aciklama = excluded.yapildi_aciklama,
        yapildi_tarihi = excluded.yapildi_tarihi;
end;
$$;

revoke all on function madde_isaretle(text, uuid, boolean, text) from public;
grant execute on function madde_isaretle(text, uuid, boolean, text) to anon, authenticated;

create or replace function madde_yorum_ekle(p_token text, p_madde_id uuid, p_yorum text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_kullanici kullanicilar%rowtype;
  v_proje_id uuid;
begin
  v_kullanici := gecerli_kullanici(p_token);

  select r.proje_id into v_proje_id
  from maddeler m join revizyonlar r on r.id = m.revizyon_id
  where m.id = p_madde_id;

  if not proje_erisim_var_mi(v_kullanici.id, v_proje_id, v_kullanici.rol) then
    raise exception 'Yetkiniz yok';
  end if;

  insert into madde_yorumlari (madde_id, kullanici_id, yorum)
  values (p_madde_id, v_kullanici.id, p_yorum);
end;
$$;

revoke all on function madde_yorum_ekle(text, uuid, text) from public;
grant execute on function madde_yorum_ekle(text, uuid, text) to anon, authenticated;

create or replace function revizyon_isaretle(p_token text, p_revizyon_id uuid, p_yapildi boolean)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_kullanici kullanicilar%rowtype;
  v_proje_id uuid;
begin
  v_kullanici := gecerli_kullanici(p_token);

  select r.proje_id into v_proje_id from revizyonlar r where r.id = p_revizyon_id;

  if not proje_erisim_var_mi(v_kullanici.id, v_proje_id, v_kullanici.rol) then
    raise exception 'Yetkiniz yok';
  end if;

  insert into revizyon_durumlari (revizyon_id, kullanici_id, yapildi, yapildi_tarihi)
  values (p_revizyon_id, v_kullanici.id, p_yapildi, case when p_yapildi then now() else null end)
  on conflict (revizyon_id, kullanici_id) do update
    set yapildi = excluded.yapildi,
        yapildi_tarihi = excluded.yapildi_tarihi;
end;
$$;

revoke all on function revizyon_isaretle(text, uuid, boolean) from public;
grant execute on function revizyon_isaretle(text, uuid, boolean) to anon, authenticated;

NOTIFY pgrst, 'reload schema';
