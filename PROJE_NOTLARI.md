# hnotlar — Proje Notları

## Genel Amaç
Kullanıcı (Resul), patronuyla yaptığı görüşmeler sonucunda çıkardığı notları personellere ve firmalara iletiyor. Bu proje, bu sürecin merkezi bir sistemden takip edilmesini sağlamayı hedefliyor.

## Veri Modeli: Proje → Revizyon → Madde
- **Proje:** Admin tarafından oluşturulur, birden fazla kullanıcıya (personel/firma/patron) atanabilir.
- **Revizyon:** Bir proje içinde "gönderilen" güncelleme/revize başlığı. Kullanıcı projeye tıklayınca en son gönderilen revizyonu görür.
- **Madde:** Bir revizyon içinde sınırsız sayıda madde olabilir. Her maddenin opsiyonel ekstra metin/görsel/video'su olabilir.
- **Madde durumu:** Her kullanıcı kendi maddesini bağımsız olarak "yapıldı" işaretler (aynı madde birden fazla kullanıcıya atanmışsa herkes kendi durumunu işaretler), isteğe bağlı açıklama girebilir. Admin kimin işaretlediğini görebilir.
- **Madde yorumu:** Kullanıcılar anlamadıkları maddelere yorum/geri bildirim yazabilir.

## Kapsam
- **Giriş sayfası (index.html):** Kullanıcı adı/şifre formu, Supabase üzerinden gerçek doğrulama yapıyor.
- **Admin paneli (admin.html):** Admin projeler/revizyonlar/maddeler oluşturur, kullanıcı ve firma ekler, projelere kullanıcı atar.
- **Anasayfa (anasayfa.html):** Personel/firma/patron için kullanıcı tarafı — henüz placeholder, bir sonraki adım.
- **Kullanıcı/rol yönetimi:** admin (Resul, sistemi yönetir), patron (iş sahibi, ayrı kişi), personel, firma.

## Şu Anki Durum
- [x] Giriş sayfası Supabase'e bağlı, gerçek doğrulama + oturum token'ı çalışıyor
- [x] Admin paneli: proje/revizyon/madde oluşturma, kullanıcı/firma ekleme, projeye kullanıcı atama
- [ ] Kullanıcı tarafı (personel/firma/patron): projeyi görme, maddeyi yapıldı işaretleme, yorum yazma — `anasayfa.html` henüz placeholder
- [ ] Dosya yükleme (şu an sadece URL girilebiliyor — Supabase Storage entegrasyonu yapılmadı)
- [ ] Patron hesabı sisteme eklenecek

## Veritabanı Mimarisi Kararı
Kimlik doğrulama Supabase Auth yerine özel `kullanicilar` tablosu + `giris_yap` SQL fonksiyonu (security definer, crypt/pgcrypto ile şifre kontrolü) ile yapılıyor. Kullanıcı adı ile giriş isteniyor, e-posta zorunluluğu istenmiyor.

**Rol modeli:** Sistemi kuran/yöneten kişi (Resul) `admin` rolünde; onun patronu (gerçek iş sahibi) ayrı bir kişi olarak `patron` rolünde sisteme kendi hesabıyla girip işleri takip edip işaretleyecek. Diğer roller: `personel`, `firma`. (`admin` ≠ `patron` — ilk tasarımda karıştırılmıştı, düzeltildi.)

**Bilinen gotcha:** Supabase'de `pgcrypto` varsayılan olarak `public` şemasına değil `extensions` şemasına kuruluyor. `security definer` fonksiyonlarda `search_path`'e `extensions`'ı da eklemek gerekiyor, yoksa `crypt()`/`gen_salt()` bulunamıyor.

**Önemli kısıt:** Supabase Auth kullanılmadığı için `auth.uid()` yok, dolayısıyla RLS politikaları "bu satır bu kullanıcıya mı ait" diye native kontrol edemiyor. Bu yüzden tüm tablolarda RLS açık ve varsayılan olarak hiçbir erişim yok (anon key ile doğrudan tablo okuma/yazma kapalı) — her işlem (görev oluşturma, dosya ekleme, görev listeleme vb.) ileride ayrı ayrı `security definer` fonksiyonlarla açılacak. Şimdilik sadece `giris_yap` fonksiyonu açık.

## Not
Bu dosya, farklı bir makineden (örn. evden) devam edilirken projenin bağlamını hızlıca hatırlamak için tutuluyor. Güncellemeleri commit etmeyi unutma.
