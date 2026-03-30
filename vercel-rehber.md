# 🚀 Vercel Canlıya Alma Rehberi

Projeniz şu an teknik olarak tertemiz ve yayına hazır durumda. Aşağıdaki adımları takip ederek 5 dakika içinde sisteminizi internete açabilirsiniz.

### 1. Hazırlık Kontrolü
✅ Yerel build testi yapıldı (Hata yok).
✅ `.gitignore` dosyası ayarlandı (Gizli bilgileriniz dışarı sızmaz).

### 2. GitHub'a Yükleme (Eğer yapmadıysanız)
Terminalden şu komutları sırasıyla çalıştırabilirsiniz:
```bash
git add .
git commit -m "Vercel yayını için hazır"
# GitHub'da yeni bir repo oluşturun ve oradaki 'existing repository' komutlarını buraya yapıştırın.
```

### 3. Vercel Kurulumu
1. [Vercel Dashboard](https://vercel.com/dashboard) sayfasına gidin.
2. **"Add New"** > **"Project"** butonuna basın.
3. GitHub reponuzu seçin ve **"Import"** deyin.
4. **"Environment Variables"** bölümünü açın ve burası çok önemli; şu iki değeri ekleyin:
   - `NEXT_PUBLIC_SUPABASE_URL` -> (Supabase panelinizdeki URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` -> (Supabase panelinizdeki Anon Key)
5. **"Deploy"** butonuna basın.

### 4. Sonuç
Vercel size `kocluk.vercel.app` gibi bir adres verecektir. Artık öğrencileriniz ve öğretmenleriniz bu adres üzerinden sisteme giriş yapabilir!

---
💡 **Not:** Herhangi bir adımda takılırsanız buradayım, sormanız yeterli.
