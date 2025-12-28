# Node.js Kurulum Rehberi - Quatrix

## 🟢 Önerilen: Node.js 20 LTS

### Neden Node.js 20?
- ✅ **LTS (Long Term Support)**: 2026 Nisan'a kadar destek
- ✅ **Kararlı**: Production için güvenli
- ✅ **Modern**: ES2023 özellikleri, native test runner
- ✅ **Performans**: V8 engine güncellemeleri
- ✅ **Güvenlik**: Düzenli güvenlik güncellemeleri

---

## 📥 Kurulum Seçenekleri

### Seçenek 1: NVM (Node Version Manager) - ⭐ ÖNERİLEN

#### Windows için nvm-windows:

1. **İndir:**
   - https://github.com/coreybutler/nvm-windows/releases
   - `nvm-setup.exe` dosyasını indir ve çalıştır

2. **Kur:**
   ```powershell
   # Kurulum sonrası PowerShell'i yeniden başlat
   
   # Node.js 20 LTS'yi kur
   nvm install 20
   
   # Node.js 20'yi kullan
   nvm use 20
   
   # Sürümü kontrol et
   node --version
   # Beklenen: v20.x.x
   ```

3. **Proje Dizininde Otomatik Seçim:**
   ```powershell
   # Quatrix dizinine git
   cd c:\Users\user\quatrix
   
   # .nvmrc dosyası var, otomatik kullan
   nvm use
   ```

#### Linux/macOS için nvm:

```bash
# nvm kur
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Terminal'i yeniden başlat

# Node.js 20 LTS kur
nvm install 20

# Node.js 20'yi kullan
nvm use 20

# Varsayılan yap
nvm alias default 20
```

---

### Seçenek 2: Direkt Kurulum

#### Windows için:

1. **İndir:**
   - https://nodejs.org/en/download
   - "20.x.x LTS" sürümünü seç
   - Windows Installer (.msi) indir

2. **Kur:**
   - Installer'ı çalıştır
   - Varsayılan ayarlarla devam et
   - "Automatically install necessary tools" seçeneğini işaretle

3. **Doğrula:**
   ```powershell
   # PowerShell'i yeniden başlat
   node --version
   npm --version
   ```

#### Linux (Ubuntu/Debian):

```bash
# NodeSource repository ekle
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js kur
sudo apt-get install -y nodejs

# Doğrula
node --version
npm --version
```

#### macOS:

```bash
# Homebrew ile
brew install node@20

# Doğrula
node --version
npm --version
```

---

## ✅ Kurulum Sonrası Doğrulama

```bash
# Node.js sürümü
node --version
# Beklenen: v20.11.0 veya üzeri

# npm sürümü
npm --version
# Beklenen: v10.2.4 veya üzeri

# Global paketleri kontrol et
npm list -g --depth=0
```

---

## 🔧 Global Paketler (Opsiyonel)

### Gerekli Paketler:

```bash
# TypeScript (opsiyonel, projede zaten var)
npm install -g typescript

# PM2 (production process manager)
npm install -g pm2

# Prisma CLI (opsiyonel, projede zaten var)
npm install -g prisma
```

### Kullanışlı Paketler:

```bash
# nodemon (otomatik restart)
npm install -g nodemon

# npm-check-updates (dependency güncellemeleri)
npm install -g npm-check-updates
```

---

## 🚀 Quatrix Projesinde Kullanım

### 1. Sürüm Kontrolü

Proje, `package.json` dosyalarında Node.js 20+ gerektirir:

```json
{
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

### 2. Bağımlılıkları Yükle

```bash
# Frontend
cd c:\Users\user\quatrix\frontend
npm install

# Backend
cd c:\Users\user\quatrix\backend
npm install
```

### 3. Geliştirme Sunucularını Başlat

```bash
# Backend (Terminal 1)
cd c:\Users\user\quatrix\backend
npm run dev

# Frontend (Terminal 2)
cd c:\Users\user\quatrix\frontend
npm run dev
```

---

## 🐛 Sorun Giderme

### "node: command not found" hatası

**Windows:**
```powershell
# PATH'e eklenmiş mi kontrol et
$env:PATH

# Node.js'i yeniden kur veya PATH'e manuel ekle
```

**Linux/macOS:**
```bash
# PATH'e eklenmiş mi kontrol et
echo $PATH

# .bashrc veya .zshrc'ye ekle
export PATH="$HOME/.nvm/versions/node/v20.x.x/bin:$PATH"
```

### npm izin hataları (Linux/macOS)

```bash
# npm global dizinini değiştir
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Windows'ta npm yavaş çalışıyor

```powershell
# Windows Defender'da npm dizinini hariç tut
# Ayarlar > Güvenlik > Windows Güvenliği > Virüs ve tehdit koruması
# Hariç tutmalar > Klasör ekle > C:\Users\<kullanıcı>\AppData\Roaming\npm
```

---

## 📊 Sürüm Karşılaştırması

| Sürüm | Durum | Destek Bitiş | Önerilir mi? |
|-------|-------|--------------|--------------|
| Node.js 16 | EOL | Eylül 2023 | ❌ Hayır |
| Node.js 18 | LTS | Nisan 2025 | ⚠️ Eski |
| **Node.js 20** | **LTS** | **Nisan 2026** | ✅ **Evet** |
| Node.js 21 | Current | - | ❌ Deneysel |
| Node.js 22 | Current | - | ❌ Deneysel |

---

## 🎯 Özet

### Hızlı Kurulum (Windows):

```powershell
# 1. nvm-windows kur
# https://github.com/coreybutler/nvm-windows/releases

# 2. Node.js 20 kur
nvm install 20
nvm use 20

# 3. Doğrula
node --version  # v20.x.x
npm --version   # v10.x.x

# 4. Quatrix bağımlılıklarını yükle
cd c:\Users\user\quatrix\frontend
npm install

cd c:\Users\user\quatrix\backend
npm install

# 5. Başlat!
npm run dev
```

---

**Kurulum tamamlandıktan sonra bir sonraki adıma geçebiliriz!** 🚀
