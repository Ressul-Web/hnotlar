# hnotlar — Proje Notları

## Genel Amaç
Kullanıcı (Resul), patronuyla yaptığı görüşmeler sonucunda çıkardığı notları personellere ve firmalara iletiyor. Bu proje, bu sürecin merkezi bir sistemden takip edilmesini sağlamayı hedefliyor.

## Kapsam
- **Giriş sayfası (index.html):** Kullanıcı adı/şifre formu. Şu an için gerçek kimlik doğrulama yok; giriş butonuna basınca doğrudan anasayfaya yönlendiriyor.
- **Anasayfa:** Notlar, görevler ve dosya (evrak/fotoğraf/video) takibinin yapılacağı ana ekran. Dosyalar/evraklar düzgün bir sıra ile listelenecek.
- **Görev takibi:** Patron ve kullanıcı, işleri buradan takip edip tamamlananları işaretleyebilecek.
- **Kullanıcı/rol yönetimi:** Çalışılan firmalar ve personeller için ayrı kullanıcı hesapları açılacak; her kullanıcı giriş yaptığında sadece kendi görevlerini görecek (rol bazlı görünüm).

## Şu Anki Durum
- [x] Statik giriş sayfası + anasayfaya yönlendirme
- [x] Supabase şeması tasarlandı ve deploy edildi (`supabase/schema.sql`) — firmalar, kullanicilar, gorevler, gorev_dosyalari
- [x] Frontend Supabase'e bağlandı, gerçek giriş çalışıyor (kullanıcı adı + şifre, `giris_yap` RPC)
- [ ] Patron hesabı da sisteme eklenecek (patron kendi girişiyle işleri takip edip işaretleyecek)
- [ ] Rol bazlı kullanıcı sistemi (admin / patron / personel / firma)
- [ ] Görev/not oluşturma ve atama
- [ ] Evrak/fotoğraf/video yükleme ve sıralı görüntüleme
- [ ] Görev durumu işaretleme (yapıldı/yapılmadı)

## Veritabanı Mimarisi Kararı
Kimlik doğrulama Supabase Auth yerine özel `kullanicilar` tablosu + `giris_yap` SQL fonksiyonu (security definer, crypt/pgcrypto ile şifre kontrolü) ile yapılıyor. Kullanıcı adı ile giriş isteniyor, e-posta zorunluluğu istenmiyor.

**Rol modeli:** Sistemi kuran/yöneten kişi (Resul) `admin` rolünde; onun patronu (gerçek iş sahibi) ayrı bir kişi olarak `patron` rolünde sisteme kendi hesabıyla girip işleri takip edip işaretleyecek. Diğer roller: `personel`, `firma`. (`admin` ≠ `patron` — ilk tasarımda karıştırılmıştı, düzeltildi.)

**Bilinen gotcha:** Supabase'de `pgcrypto` varsayılan olarak `public` şemasına değil `extensions` şemasına kuruluyor. `security definer` fonksiyonlarda `search_path`'e `extensions`'ı da eklemek gerekiyor, yoksa `crypt()`/`gen_salt()` bulunamıyor.

**Önemli kısıt:** Supabase Auth kullanılmadığı için `auth.uid()` yok, dolayısıyla RLS politikaları "bu satır bu kullanıcıya mı ait" diye native kontrol edemiyor. Bu yüzden tüm tablolarda RLS açık ve varsayılan olarak hiçbir erişim yok (anon key ile doğrudan tablo okuma/yazma kapalı) — her işlem (görev oluşturma, dosya ekleme, görev listeleme vb.) ileride ayrı ayrı `security definer` fonksiyonlarla açılacak. Şimdilik sadece `giris_yap` fonksiyonu açık.

## Not
Bu dosya, farklı bir makineden (örn. evden) devam edilirken projenin bağlamını hızlıca hatırlamak için tutuluyor. Güncellemeleri commit etmeyi unutma.
