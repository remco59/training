# Enkeltraining

PWA met een 4-weken enkeltraining voor schaatsers: training van de dag, timer per oefening, rust, plaatjes, schema met instelbare dagen. Geen build en geen backend; voortgang staat in `localStorage`.

## Draaien
Statische bestanden via HTTPS serveren (een PWA vereist HTTPS).

    docker build -t enkeltraining .
    docker run -d --name enkeltraining --restart unless-stopped -p 8089:80 enkeltraining

Daarna in Nginx Proxy Manager `training.remcoland.nl` naar `<tower-ip>:8089`, met SSL. Op de telefoon in Chrome openen en "App installeren" kiezen.

## Bijwerken
- Pas bestanden aan en verhoog `VERSION` in `sw.js` (bijv. `enkel-v2`), dan krijgt de telefoon de nieuwe versie.
- Plaatje vervangen: zelfde bestandsnaam in `img/` (`.webp`, ca. 1000 px).

## Bekend
- `img/band.webp` toont alleen "tenen naar buiten" (band aan de binnenkant vast). Voor "naar binnen" moet de band aan de buitenkant vast; dat staat in de tekst bij de oefening.
