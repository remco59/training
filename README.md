# Enkeltraining

PWA met een 4-weken enkeltraining voor schaatsers: training van de dag, timer per oefening, rust, plaatjes, schema met instelbare dagen.

Data (instellingen en afgevinkte trainingen) staat altijd lokaal in de browser (`localStorage`) en wordt, als je een token invult, ook gesynchroniseerd met een SQLite-database op de server. De app werkt offline door; wijzigingen worden later verstuurd. Bij een conflict wint de nieuwste wijziging. Elke afgeronde training komt daarnaast in een logtabel (`GET /api/log`).

## Draaien (Unraid)
1. Zet in `docker-compose.yml` een eigen `TOKEN` (minimaal 12 tekens, lang en willekeurig).
2. `docker compose up -d --build`
3. Nginx Proxy Manager: `training.remcoland.nl` naar `<tower-ip>:8089`, met SSL.
4. Open de app op de telefoon, ga naar Instellingen en vul het token in bij "Synchronisatie".

Database: `/mnt/user/appdata/enkeltraining/enkeltraining.sqlite`. Back-up = dat bestand kopieren.
Zonder `TOKEN` is de API uitgeschakeld en werkt de app alleen lokaal.

## Bijwerken
- Pas bestanden in `public/` aan en verhoog `VERSION` in `public/sw.js` (bijv. `enkel-v4`).
- Plaatje vervangen: zelfde bestandsnaam in `public/img/` (`.webp`, ca. 1000 px).

## API (alles met `Authorization: Bearer <TOKEN>`)
- `GET /api/state`, `PUT /api/state` (`{state, updatedAt}`, nieuwste wint)
- `POST /api/log`, `GET /api/log`

## Bekend
- `img/band.webp` toont alleen "tenen naar buiten"; voor "naar binnen" staat in de tekst dat de band aan de buitenkant vast moet.
- Een training die je offline afrondt komt wel in je voortgang, maar niet in de logtabel.
