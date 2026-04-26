# Gelecek Geliştirmeler (Ajanda & Ders Sistemi)

1. **Öğretmen Tatil/Müsait Olmama Durumu:**
   - Öğretmen ajandaya "tatil" (veya müsait değil) bloğu ekleyebilecek.
   - Bu tatil tüm gün veya günün belli saatlerini kapsayabilecek.
   - Tatil olan saatlere yeni ders eklenmek istendiğinde sistem çakışma uyarısı verip izin vermeyecek.
   - Tatil blokları da dersler gibi "Haftalık Tekrar" seçeneği ile (örneğin her pazar) eklenebilecek.

2. **İptal Edilen Dersleri Silme:**
   - Mevcut durumda ajandada bir ders iptal edildiğinde (çarpıya basıldığında) dersin üzerindeki silme butonu kayboluyor. 
   - İptal edilen (cancelled statüsündeki) derslerin de tamamen sistemden silinebilmesi için "Sil" butonu aktif edilecek.

3. **Öğrenci Varsayılan Ücret Otomasyonu:**
   - Ajandaya yeni ders eklerken Modal üzerinden bir öğrenci seçildiğinde, öğrencinin profilindeki "varsayılan ders ücreti" otomatik olarak fiyat alanına yazılacak.
   - Öğretmen dilerse bu otomatik gelen ücreti manuel olarak değiştirebilecek. 
   *(Not: Bu özellik altyapı olarak `AgendaModal.jsx`'te eklendi, ancak sonraki aşamada sorunsuz çalıştığı test edilip/teyit edilecek.)*
