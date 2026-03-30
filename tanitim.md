# 🎓 Koçluk - Eğitim Takip ve Analiz Sistemi

Bu proje, öğretmenlerin öğrencilerine dijital optik formlar üzerinden ödev verebilmelerini, bu ödevlerin sonuçlarını otomatik olarak analiz edebilmelerini ve konu bazlı gelişim raporları alabilmelerini sağlayan modern bir eğitim platformudur.

## 🚀 Projenin Amacı
Geleneksel ödev sistemlerini dijitalleştirerek öğretmenlerin yükünü hafifletmek; öğrencilerin hangi konularda eksik olduğunu veriye dayalı (istatistiksel) grafiklerle anlık olarak tespit etmektir.

## ✨ Temel Özellikler

### 👨‍🏫 Öğretmen Paneli
*   **Ödev Sihirbazı:** Soru sayısı, seçenek sayısı ve son teslim tarihi belirlenerek hızlıca ödev oluşturma.
*   **Akıllı Cevap Anahtarı:** Her soruya özel konu atayabilme özelliği sayesinde hangi sorunun hangi kazanımı ölçtüğünü belirleme.
*   **Konu Yönetimi:** Müfredata uygun konuları önceden tanımlama veya ödev anında hızlıca ekleme.
*   **Detaylı Analizler:**
    *   Ödev bazlı genel başarı grafikleri (Doğru/Yanlış/Boş oranları).
    *   Öğrenci bazlı bireysel gelişim takibi.
    *   **Dinamik İstatistik Filtreleme:** Öğrencinin geçmiş ödevlerinden istediklerinizi seçerek sadece seçili ödevlerin birleşik istatistiklerini görebilme.
*   **Zaman Takibi:** Son teslim tarihi geçen ödevler için otomatik "Süresi Doldu" ve "Geç Teslim" uyarıları.

### 🎓 Öğrenci Paneli
*   **Dijital Optik Form:** Kullanıcı dostu arayüz ile ödevleri işaretleme ve sisteme yükleme.
*   **Anlık Geri Bildirim:** Ödevi bitirir bitirmez puanını ve doğru/yanlış cevaplarını görebilme.
*   **Ödev Takibi:** Kendisine atanan aktif ve tamamlanmış ödevleri görüntüleme.

### 🛡️ Yönetici (Admin) Paneli
*   **Kullanıcı Yönetimi:** Sisteme yeni öğretmenler tanımlama ve mevcut kullanıcıları yönetme.

## 🛠️ Kullanılan Teknolojiler

*   **Frontend:** [Next.js](https://nextjs.org/) (App Router & React)
*   **Veritabanı & Auth:** [Supabase](https://supabase.com/) (PostgreSQL & Row Level Security)
*   **Grafikler:** [Recharts](https://recharts.org/) (Dinamik Bar ve Pasta Grafikleri)
*   **Tarih Yönetimi:** [date-fns](https://date-fns.org/)
*   **Stil:** [Tailwind CSS](https://tailwindcss.com/) (Modern ve Responsive Tasarım)
*   **İkonlar:** [Lucide React](https://lucide.dev/)

## 🏗️ Mimari Yapı
Proje, **Role-Based Access Control (RBAC)** prensibiyle çalışır. Veritabanı katmanında **Row Level Security (RLS)** kullanılarak verilerin güvenliği sağlanmıştır; öğretmenler sadece kendi öğrencilerini ve ödevlerini, öğrenciler ise sadece kendilerine atanan ödevleri görebilirler.
