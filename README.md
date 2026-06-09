# Yapay Zeka Destekli Gayrimenkul ve Risk Analizi (Antigravity Geo-Risk)

Bu proje, harita üzerinden seçilen herhangi bir konuma ait sismik (deprem), taşkın (sel) ve zemin risklerini analiz eden, yapay zeka destekli gayrimenkul değerlemesi ve aksiyon önerileri sunan modern bir **Web GIS (Coğrafi Bilgi Sistemleri)** uygulamasıdır.

---

## Proje Mimarisi ve Özellikleri

Uygulama üç ana katmandan oluşmaktadır:
1. **Veritabanı**: Coğrafi poligon, çizgi ve nokta verilerini saklamak, CBS mekansal sorguları (`ST_Distance`, `ST_Contains`) yapabilmek için **PostgreSQL + PostGIS**.
2. **Backend (Python FastAPI)**: Port **8081** üzerinde çalışır. CBS verilerini işler, ağırlıklı risk skoru hesaplar, emlak değerleme motoru ve yapay zeka rapor oluşturucu içerir.
3. **Frontend (React + Leaflet)**: Port **5174** üzerinde çalışır. Karanlık mod tasarımı, cam efekti (glassmorphism) ve interaktif harita katmanları barındırır. Harita üzerinde fay hatları kırmızı kesikli çizgilerle, sel taşkın havzaları ise mavi alanlarla görselleştirilmiştir.

### 🔌 Akıllı GIS Modu (Graceful Fallback)
Eğer sisteminizde Docker veya PostgreSQL/PostGIS yüklü değilse, backend **otomatik olarak bellek içi coğrafi analiz motoruna (Simulated GIS Engine)** geçer. Bu modda `Shapely` ve `Haversine` kütüphaneleri kullanılarak İstanbul genelindeki demo fay hattı ve taşkın bölgesi verileri milisaniyeler içinde matematiksel mesafe hesaplamaları yapılır. **Uygulama veritabanı olmasa dahi tamamen çalışır durumdadır.**

---

## Kurulum ve Çalıştırma

### Yöntem 1: Docker Compose ile Çalıştırma (Önerilen)
Tüm servisleri (PostGIS, Backend ve Frontend) tek bir komutla ayağa kaldırabilirsiniz. Bu yöntem PostGIS CBS veritabanını da aktif eder.

1. Docker Daemon'ın çalıştığından emin olun.
2. Projenin kök dizininde aşağıdaki komutu çalıştırın:
   ```bash
   docker-compose up --build
   ```
3. Tarayıcınızda [http://localhost:5174](http://localhost:5174) adresine gidin.

*Not: Uygulama ilk kez açıldığında, İstanbul genelindeki fay hatları ve taşkın bölgeleri veritabanına otomatik olarak tohumlanır (seed).*

---

### Yöntem 2: Yerel Olarak Çalıştırma (Simüle Mod)
Docker kullanmadan, doğrudan bilgisayarınız üzerinde çalıştırmak isterseniz:

#### 1. Backend'i Başlatma (Port 8081)
```bash
# Backend dizinine geçin
cd backend

# Sanal ortam oluşturun ve aktif edin (Opsiyonel)
python -m venv venv
venv\Scripts\activate  # Windows için

# Bağımlılıkları yükleyin
pip install -r requirements.txt

# Sunucuyu başlatın
python main.py
```
*Backend `http://localhost:8081` adresinde çalışacaktır. PostGIS bağlantısı kurulamayacağı için otomatik olarak Simüle GIS modunda başlayacaktır.*

#### 2. Frontend'i Başlatma (Port 5174)
```bash
# Frontend dizinine geçin
cd frontend

# Bağımlılıkları yükleyin
npm install

# Uygulamayı başlatın
npm run dev
```
*Frontend `http://localhost:5174` adresinde çalışmaya başlayacaktır.*

---

## Nasıl Kullanılır?

1. Tarayıcınızdan **`http://localhost:5174`** adresini açın.
2. Haritada İstanbul'da bir konuma tıklayın:
   - **Deprem Riskini Test Etmek İçin**: Haritanın güneyindeki (Marmara Denizi kıyısındaki) kırmızı kesikli çizgilere yakın alanlara veya kuzeydeki fay segmentine yakın yerlere tıklayın. Faya yakınlaştıkça ve bina yaşı arttıkça riskin yükseldiğini gözlemleyin.
   - **Sel Riskini Test Etmek İçin**: Haritada mavi renkle çizilmiş olan **Ayamama Deresi**, **Alibeyköy Deresi** veya **Riva Deresi** taşkın yataklarının içine tıklayın. Risk çubuklarındaki sel tehlikesinin tavan yaptığını göreceksiniz.
   - **Zemin Karşılaştırması İçin**: Kuzeydeki ormanlık kayaç zemin (A/B Sınıfı) ile güneydeki killi/alüvyon zemin (E Sınıfı) bölgelerini tıklayarak zemin güvenliği puanlarının nasıl değiştiğini inceleyin.
3. Sol taraftaki cam panelden **Bina Yaşı** ve **Gayrimenkul Türü** değerlerini değiştirip **"Parametreleri Güncelle"** butonuna basarak yapay zekanın emlak değer tahminini ve güvenlik tavsiyelerini dinamik olarak güncelleyin.
