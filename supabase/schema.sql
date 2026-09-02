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
-- KULLANICILAR (patron / personel / firma)
-- ============================================================
create table if not exists kullanicilar (
  id uuid primary key default gen_random_uuid(),
  kullanici_adi text not null unique,
  sifre_hash text not null,
  ad_soyad text not null,
  rol text not null check (rol in ('admin', 'patron', 'personel', 'firma')),
  firma_id uuid references firmalar(id) on delete set null,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- GOREVLER (patron gorusmelerinden cikan notlar/isler)
-- ============================================================
create table if not exists gorevler (
  id uuid primary key default gen_random_uuid(),
  baslik text not null,
  aciklama text,
  olusturan_id uuid not null references kullanicilar(id),
  atanan_id uuid references kullanicilar(id),
  firma_id uuid references firmalar(id),
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'devam_ediyor', 'tamamlandi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- GOREV DOSYALARI (evrak / fotograf / video, sirali)
-- ============================================================
create table if not exists gorev_dosyalari (
  id uuid primary key default gen_random_uuid(),
  gorev_id uuid not null references gorevler(id) on delete cascade,
  dosya_url text not null,
  dosya_tipi text not null check (dosya_tipi in ('evrak', 'fotograf', 'video')),
  sira integer not null default 0,
  yukleyen_id uuid references kullanicilar(id),
  created_at timestamptz not null default now()
);

create index if not exists gorev_dosyalari_gorev_id_idx on gorev_dosyalari(gorev_id, sira);
create index if not exists gorevler_atanan_id_idx on gorevler(atanan_id);
create index if not exists gorevler_firma_id_idx on gorevler(firma_id);

-- ============================================================
-- GIRIS FONKSIYONU
-- Kullanici adi + sifreyi dogrular, sifre_hash'i asla disari vermez.
-- RLS her tabloda kapali oldugu icin anon key ile dogrudan tablo
-- okuma/yazma yapilamaz - sadece bu ve ileride eklenecek benzer
-- "security definer" fonksiyonlar uzerinden erisim saglanir.
-- ============================================================
create or replace function giris_yap(p_kullanici_adi text, p_sifre text)
returns table (
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
begin
  return query
  select k.id, k.kullanici_adi, k.ad_soyad, k.rol, k.firma_id
  from kullanicilar k
  where k.kullanici_adi = p_kullanici_adi
    and k.aktif = true
    and k.sifre_hash = crypt(p_sifre, k.sifre_hash);
end;
$$;

revoke all on function giris_yap(text, text) from public;
grant execute on function giris_yap(text, text) to anon, authenticated;

-- ============================================================
-- RLS: tum tablolarda kapali erisim (varsayilan reddet)
-- Ileride her islem icin ayri security definer fonksiyon eklenecek.
-- ============================================================
alter table firmalar enable row level security;
alter table kullanicilar enable row level security;
alter table gorevler enable row level security;
alter table gorev_dosyalari enable row level security;

-- ============================================================
-- ILK PATRON KULLANICISINI OLUSTURMA (ORNEK - kendi bilgilerinle degistir)
-- Bu satiri SQL Editor'de calistirmadan once kullanici_adi ve sifreyi degistir.
-- ============================================================
-- insert into kullanicilar (kullanici_adi, sifre_hash, ad_soyad, rol)
-- values ('resul', crypt('GUCLU_BIR_SIFRE', gen_salt('bf')), 'Resul', 'patron');
