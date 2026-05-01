# 🌤️ GeoWeather API

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-%3E%3D15-blue)](https://www.postgresql.org/)
[![Tests](https://img.shields.io/badge/Tests-Jest-green?logo=jest)](https://jestjs.io/)

Eine produktionsreife Cloud-basierte REST API für eine Wetter-Anwendung mit **Favoriten-Sync**, **History-Archiv** und flexiblem **Premium-Abonnement-System**.

[🚀 Quick Start](#-quick-start) • [📚 Dokumentation](#-dokumentation) • [🤝 Beiträge](#-contributing) • [📄 Lizenz](#-license)

---

## ✨ Features

### 1. ☁️ **Favoriten-Sync (Standorte)**
- ✅ Benutzer speichern bevorzugte Orte in der Cloud
- ✅ Automatische geräteübergreifende Synchronisation
- ✅ Echtzeit-Updates auf allen Geräten
- ✅ Batch-Upload & Download Support

### 2. 📊 **Wetter-History-Archiv**
- ✅ Lokale Messungen (Temperatur, Luftdruck, Sensoren)
- ✅ Langzeit-Graphen und Trends
- ✅ Monatliche und jährliche Statistiken
- ✅ Automatische Archivierung alter Daten (>1 Jahr)
- ✅ CSV-Export für Premium-Nutzer

### 3. 💰 **Premium-Open-SaaS-Modell**

| Feature | Free | Premium | Enterprise |
|---------|:----:|:-------:|:----------:|
| Favoriten | 5 | 50 | ∞ |
| History-Tage | 30 | 365 | 1825 |
| Datenquellen | 1 | 3 | 10 |
| Push-Benachrichtigungen | ❌ | ✅ | ✅ |
| Karten-Layer (Radar, Satellit) | ❌ | ✅ | ✅ |
| Daten-Export | ❌ | ✅ | ✅ |
| API Rate Limits | 100 req/hr | 10k req/hr | Unlimited |
| Support | Community | Email | Priority |

### 4. 🎯 **Premium-Features**
- ✅ Multi-Source Wetterdaten (OpenWeather, WeatherAPI)
- ✅ Unwetter-Push-Benachrichtigungen
- ✅ Karten-Layer (Radar, Satellit, Heatmap, Wind)
- ✅ Open-Data-Export

---

## 🚀 Quick Start

### Voraussetzungen
- Node.js 18+
- Docker & Docker Compose (optional)
- PostgreSQL 15+ (nur wenn lokal)

### Mit Docker Compose (⭐ empfohlen)
```bash
git clone https://github.com/yourusername/GeoWeather-API.git
cd GeoWeather-API

cp .env.example .env
docker-compose up -d
docker-compose exec api npm run db:migrate

# Health Check
curl http://localhost:3000/api/health
```

### Lokal ohne Docker
```bash
git clone https://github.com/yourusername/GeoWeather-API.git
cd GeoWeather-API

npm install
npm run db:migrate
npm run dev
```

**API läuft auf:** `http://localhost:3000`

### Mit Postman
Importiere die [Postman-Collection](docs/Postman-Collection.json) und teste die API sofort!

---

## 📝 API Schnell-Beispiele

### 1. Benutzer registrieren
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "MyPassword123!",
    "name": "John Doe"
  }'
```

Response: `{ token, refreshToken, user }`

### 2. Favorit erstellen
```bash
curl -X POST http://localhost:3000/api/favorites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "München",
    "latitude": 48.1351,
    "longitude": 11.5820
  }'
```

### 3. Wetterdaten aufzeichnen
```bash
curl -X POST http://localhost:3000/api/weather-history/record \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "München",
    "temperature": 22.5,
    "humidity": 65,
    "pressure": 1013.25,
    "windSpeed": 5.2,
    "conditions": "Wolkig"
  }'
```

### 4. Premium-Abo erstellen
```bash
curl -X POST http://localhost:3000/api/subscriptions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tier": "premium", "paymentMethod": "stripe"}'
```

---

## 📚 Dokumentation

| Dokument | Beschreibung |
|----------|------------|
| [docs/API.md](docs/API.md) | 📖 Vollständige REST API Dokumentation |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 🏗️ System-Design & Datenfluss |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | 🚀 Deployment auf 6 verschiedenen Plattformen |
| [QUICKSTART.md](QUICKSTART.md) | ⚡ Schnellstart-Guide |
| [docs/Postman-Collection.json](docs/Postman-Collection.json) | 📮 Postman API-Tests |

### API Basis URLs
- **Lokal:** `http://localhost:3000/api`
- **Production:** `https://api.geoweather.com/api`

### API Übersicht

| Kategorie | Endpoints | Beispiele |
|-----------|:---------:|----------|
| Auth | 3 | register, login, logout |
| Favorites | 6 | create, getAll, update, sync |
| History | 5 | record, getHistory, analytics, export |
| Subscriptions | 4 | create, get, upgrade, features |
| Premium | 3 | weather-sources, map-layers, alert |
| **Total** | **24** | - |

---

## 🏗️ Architektur

```
┌─────────────────────────────────────────┐
│   Client Applications                   │
│   (Mobile, Web, Desktop)                │
└──────────────────┬──────────────────────┘
                   │ HTTPS
                   ▼
      ┌────────────────────────────┐
      │   Express.js REST API      │
      │   JWT Authentication       │
      │   24 Endpoints             │
      └────────────┬───────────────┘
                   │
      ┌────────────┴──────────────┐
      ▼                           ▼
 ┌──────────────┐        ┌──────────────┐
 │  PostgreSQL  │        │    Redis     │
 │  (Persistent)│        │   (Cache)    │
 └──────────────┘        └──────────────┘
```

Siehe [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) für detaillierte Systemarchitektur.

---

## 🧪 Testing

```bash
# Unit Tests
npm test

# Mit Coverage Report
npm test -- --coverage

# Code Linting
npm run lint

# Development mit Hot-Reload
npm run dev
```

---

## 📊 Projekt-Statistik

| Metrik | Wert |
|--------|------|
| **API Endpoints** | 24 |
| **Datenbank-Tabellen** | 5 |
| **External Services** | 3 |
| **Test-Files** | 2 |
| **Dokumentation** | 7+ Dateien |
| **Codezeilen** | 3500+ |
| **Production-Ready** | ✅ |

---

## 🚀 Deployment

Die API kann einfach auf verschiedenen Plattformen deployed werden:

- 🐳 [Docker Compose](docs/DEPLOYMENT.md#1-docker-compose-local-development--staging)
- ☁️ [Heroku](docs/DEPLOYMENT.md#2-heroku)
- 🏢 [AWS EC2 + RDS](docs/DEPLOYMENT.md#3-aws-ec2--rds)
- 💧 [DigitalOcean](docs/DEPLOYMENT.md#4-digitalocean-app-platform)
- 🔥 [Google Cloud Run](docs/DEPLOYMENT.md#5-google-cloud-run)
- ☸️ [Kubernetes](docs/DEPLOYMENT.md#6-kubernetes-production)

Vollständige Deployment-Guides: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 📦 Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Datenbank:** PostgreSQL 15
- **Cache:** Redis (optional)
- **Authentication:** JWT + Bcrypt
- **Container:** Docker & Docker Compose
- **Testing:** Jest
- **Documentation:** Markdown

---

## 🔒 Sicherheit

✅ JWT Token-basierte Authentifizierung  
✅ Bcrypt Passwort-Hashing  
✅ CORS + Helmet Security Headers  
✅ SQL-Injection Schutz (Parameterized Queries)  
✅ Input-Validierung  
✅ Rate Limiting Ready  

---

## 🗄️ Datenbank

PostgreSQL 15 mit:
- 5 Haupttabellen (users, favorites, weather_history, subscriptions, push_notifications)
- Foreign Keys & Cascade Deletes
- Performance Indizes
- JSONB für flexible Sensor-Daten

---

## 📝 Projektstruktur

```
src/
├── config/          # Auth & DB Konfiguration
├── controllers/     # 4 Business Logic Controller
├── models/          # 4 Datenbankmodelle
├── services/        # 3 External Service Integrationen
├── routes/          # 5 Route-Dateien mit 24 Endpoints
├── middleware/      # Auth & Error Handling
├── utils/           # Validators & Helpers
├── __tests__/       # 2 Test-Dateien
└── index.js         # Express Server Entry Point

docs/
├── API.md           # Vollständige API-Dokumentation
├── ARCHITECTURE.md  # System-Design
└── DEPLOYMENT.md    # Deployment-Guides
```

---

## 📋 Roadmap

- [ ] WebSocket Support für Real-time Updates
- [ ] Stripe Payment Integration
- [ ] Advanced User Analytics Dashboard
- [ ] Mobile SDKs (iOS/Android)
- [ ] GraphQL API Alternative
- [ ] Machine Learning für Wetter-Vorhersagen
- [ ] Advanced Caching mit Redis
- [ ] Microservices Architecture

---

## 🤝 Contributing

Beiträge sind sehr willkommen! Bitte:

1. **Fork** das Repository
2. Erstelle einen **Feature Branch** (`git checkout -b feature/AmazingFeature`)
3. **Committe** deine Changes (`git commit -m 'Add AmazingFeature'`)
4. **Pushe** zu deinem Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen **Pull Request**

Siehe [CONTRIBUTING.md](CONTRIBUTING.md) für detaillierte Richtlinien.

---

## 🐛 Bug Reports & Features

Bitte nutze [GitHub Issues](https://github.com/yourusername/GeoWeather-API/issues) um:
- 🐛 Bugs zu melden
- 💡 Features zu vorschlagen
- ❓ Fragen zu stellen

---

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) für Details.

Copyright (c) 2024-present GeoWeather Team

---

## 👨‍💻 Autoren

- **GeoWeather Team** - Hauptentwicklung

---

## 🙏 Danksagungen

- [OpenWeather API](https://openweathermap.org/api) für Wetterdaten
- [WeatherAPI](https://www.weatherapi.com/) für alternative Datenquellen
- [Express.js](https://expressjs.com/) Community
- Alle [Contributors](../../contributors)

---

## 📧 Support

- 📖 [Dokumentation](docs/API.md)
- 💬 [Discussions](../../discussions)
- 🐛 [Issues](../../issues)
- 📮 Email: support@geoweather.com

---

## 🎯 Quick Links

- 🚀 [Quick Start Guide](QUICKSTART.md)
- 📖 [Full API Documentation](docs/API.md)
- 🏗️ [Architecture Overview](docs/ARCHITECTURE.md)
- 🚢 [Deployment Guides](docs/DEPLOYMENT.md)
- 💻 [Source Code Structure](PROJECT_STRUCTURE.md)

---

**Gebaut mit ❤️ für bessere Wetter-Apps**
