# Deployment Guide

## Übersicht

Dieses Dokument beschreibt verschiedene Möglichkeiten, die GeoWeather API zu deployieren.

## 1. Docker Compose (Local Development & Staging)

### Schnellstart

```bash
docker-compose up -d
docker-compose exec api npm run db:migrate
```

Die API ist dann verfügbar unter `http://localhost:3000`

### Logs anzeigen

```bash
docker-compose logs -f api
```

### Stoppen

```bash
docker-compose down
```

## 2. Heroku

### Vorbereitung

```bash
npm install -g heroku
heroku login
```

### Deployment

```bash
# App erstellen
heroku create geoweather-api

# Environment-Variablen setzen
heroku config:set \
  JWT_SECRET="your_long_secret_key" \
  OPENWEATHER_API_KEY="your_key" \
  WEATHER_API_KEY="your_key" \
  NODE_ENV=production

# PostgreSQL Add-on installieren
heroku addons:create heroku-postgresql:standard-0

# Deployen
git push heroku main

# Migrationen ausführen
heroku run npm run db:migrate
```

### Logs

```bash
heroku logs --tail
```

## 3. AWS (EC2 + RDS)

### EC2 Instance Setup

```bash
# SSH in EC2 Instanz
ssh -i key.pem ec2-user@your-instance.amazonaws.com

# Node.js installieren
curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install nodejs -y

# Repository klonen
git clone https://github.com/yourusername/GeoWeathter-API.git
cd GeoWeathter-API

# Dependencies installieren
npm install

# Environment-Variablen setzen
nano .env
# Füge RDS-Verbindungsdaten ein
```

### RDS PostgreSQL erstellen

```bash
# Via AWS Management Console:
# 1. RDS > Create Database
# 2. Engine: PostgreSQL 15
# 3. DB Instance: db.t3.micro (Free Tier)
# 4. Speichere Endpunkt und Anmeldedaten
```

### Environment-Variablen

```
DATABASE_URL=postgresql://user:password@rds-endpoint:5432/geoweather
PORT=3000
NODE_ENV=production
JWT_SECRET=your_secret
```

### Systemd Service erstellen

```bash
sudo nano /etc/systemd/system/geoweather-api.service
```

```ini
[Unit]
Description=GeoWeather API
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/GeoWeathter-API
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable geoweather-api
sudo systemctl start geoweather-api
```

## 4. DigitalOcean (App Platform)

### Via Dashboard

1. Apps > Create App
2. GitHub Repository verbinden
3. Environment-Variablen hinzufügen:
   - DATABASE_URL
   - JWT_SECRET
   - etc.
4. Deploy

### Via CLI

```bash
# doctl installieren
sudo snap install doctl

# Authentifizieren
doctl auth init

# Deployment konfigurieren
doctl apps create --spec app.yaml
```

## 5. Vercel (Serverless)

### Vorbereitung

```bash
# Vercel CLI installieren
npm install -g vercel

# Anmelden
vercel login
```

### Vercel Postgres einrichten

1. Gehe zu [Vercel Dashboard](https://vercel.com/dashboard)
2. Wähle dein Projekt
3. Gehe zu Storage > Create Database > Postgres
4. Kopiere die `DATABASE_URL`

### Deployment

```bash
# Im Projekt-Verzeichnis
vercel

# Environment-Variablen setzen
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add OPENWEATHER_API_KEY
vercel env add WEATHER_API_KEY
vercel env add CORS_ORIGIN

# Deployen
vercel --prod
```

### Migrationen ausführen

Nach dem ersten Deployment:

```bash
vercel run npm run db:migrate
```

### Anmerkungen

- Vercel verwendet Serverless-Funktionen, daher sind WebSocket-Verbindungen (Socket.io) nicht unterstützt
- Für Produktion mit hoher Last erwäge Heroku oder AWS
- Kosten: Free Tier verfügbar, bezahlt ab 1000 Funktionsaufrufen/Monat

## 6. Google Cloud Run

### Vorbereitung

```bash
# Cloud SDK installieren
curl https://sdk.cloud.google.com | bash

# Authentifizieren
gcloud auth login
```

### Deployment

```bash
# Image bauen
docker build -t gcr.io/PROJECT_ID/geoweather-api .

# Zu Container Registry pushen
docker push gcr.io/PROJECT_ID/geoweather-api

# Zu Cloud Run deployen
gcloud run deploy geoweather-api \
  --image gcr.io/PROJECT_ID/geoweather-api \
  --platform managed \
  --region us-central1 \
  --set-env-vars DATABASE_URL="..." \
  --allow-unauthenticated
```

## 6. Kubernetes (Production)

### Helm Chart erstellen

```bash
helm create geoweather-api
```

### Values anpassen

```yaml
# values.yaml
replicaCount: 3

image:
  repository: gcr.io/PROJECT_ID/geoweather-api
  tag: latest

resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"

env:
  - name: NODE_ENV
    value: production
  - name: PORT
    value: "3000"
```

### Deployment

```bash
helm install geoweather-api ./geoweather-api \
  --namespace production \
  --create-namespace
```

## Monitoring & Logging

### Health Checks

```bash
curl http://your-api.com/api/health
```

### Logs aggregieren

```bash
# Mit ELK Stack, DataDog, New Relic etc.
```

## SSL/TLS Certificates

### Let's Encrypt mit Certbot

```bash
sudo certbot certonly --standalone -d api.geoweather.com
```

### Nginx als Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name api.geoweather.com;

    ssl_certificate /etc/letsencrypt/live/api.geoweather.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.geoweather.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Backups

### Datenbank-Backups automatisieren

```bash
# Täglich um 2 Uhr nachts
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz
```

### S3 Backup

```bash
aws s3 sync /backups s3://geoweather-backups/
```

## Performance Optimization

### Caching

- Redis für Session-Caching
- CloudFlare für CDN
- Browser-Caching mit ETag/Cache-Control Headers

### Database Indexing

Siehe `scripts/migrate.js` für Index-Konfiguration

### Rate Limiting

```javascript
// Express rate limiter
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

## Scaling

- **Horizontal**: Load Balancer + mehrere API-Instanzen
- **Vertikal**: Größere Server-Ressourcen
- **Database**: Read Replicas, Sharding bei Bedarf

## Troubleshooting

### Connection refused

```bash
# Port-Bindung prüfen
netstat -tlnp | grep 3000
```

### Memory Leaks

```bash
node --max-old-space-size=4096 src/index.js
```

### Slow Queries

```sql
-- PostgreSQL slow query log aktivieren
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();
```

---

Für weitere Fragen siehe [docs/API.md](API.md)
