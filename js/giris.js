const form = document.getElementById("girisForm");
const hataMesaji = document.getElementById("hataMesaji");
const girisButonu = form.querySelector(".giris-buton");

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  hataMesaji.textContent = "";

  const kullaniciAdi = document.getElementById("kullaniciAdi").value.trim();
  const sifre = document.getElementById("sifre").value;

  if (!kullaniciAdi || !sifre) {
    hataMesaji.textContent = "Kullanıcı adı ve şifre gerekli.";
    return;
  }

  girisButonu.disabled = true;
  girisButonu.textContent = "Giriş yapılıyor...";

  const { data, error } = await supabaseClient.rpc("giris_yap", {
    p_kullanici_adi: kullaniciAdi,
    p_sifre: sifre,
  });

  girisButonu.disabled = false;
  girisButonu.textContent = "Giriş Yap";

  if (error) {
    hataMesaji.textContent = "Bir hata oluştu, tekrar deneyin.";
    return;
  }

  if (!data || data.length === 0) {
    hataMesaji.textContent = "Kullanıcı adı veya şifre hatalı.";
    return;
  }

  const kullanici = data[0];
  sessionStorage.setItem("hnotlar_kullanici", JSON.stringify(kullanici));

  if (kullanici.rol === "admin") {
    window.location.href = "admin.html";
  } else {
    window.location.href = "anasayfa.html";
  }
});
