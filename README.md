# Glubloo

Eine Vite + React + Tailwind App, die Nightscout-Daten visualisiert. Nightscout-URL und Token werden pro eingeloggtem Nutzer in Firestore gespeichert.

## Features

- Firebase Login (Google)
- Nightscout Settings pro Nutzer in Firestore (`users/{uid}/settings/nightscout`)
- aktueller Glukosewert in `mg/dL`
- Statusanzeige: `Niedrig`, `Im Zielbereich`, `Hoch`
- Trendanzeige (Pfeile + Klartext)
- Delta zum vorherigen Messwert
- Verlaufschart der letzten Einträge
- Liste der letzten Messwerte
- automatischer Refresh alle 60 Sekunden

## Tech Stack

- React 18
- Vite 5
- Tailwind CSS 4.2
- Firebase Auth + Firestore

## Voraussetzungen

- Bun (empfohlen) oder Node.js 18+
- Firebase Projekt
- aktivierte Google-Anmeldung in Firebase Auth
- Firestore Datenbank im Firebase Projekt

## Installation & Start

### Mit Bun (empfohlen)

```bash
bun install
bun run dev
```

### Mit npm

```bash
npm install
npm run dev
```

App läuft standardmäßig auf:

- [http://localhost:5173](http://localhost:5173)

## Build

### Mit Bun

```bash
bun run build
bun run preview
```

### Mit npm

```bash
npm run build
npm run preview
```

## Konfiguration

Lege eine `.env` oder `.env.local` an.

Beispiel:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ENTRY_LIMIT=72
```

### Variablen

- `VITE_FIREBASE_API_KEY`: Firebase Web API Key
- `VITE_FIREBASE_AUTH_DOMAIN`: Firebase Auth Domain
- `VITE_FIREBASE_PROJECT_ID`: Firebase Project ID
- `VITE_FIREBASE_APP_ID`: Firebase App ID
- `VITE_ENTRY_LIMIT`: Anzahl geladener Einträge

Nightscout URL und Token werden ausschließlich nach Login aus Firestore geladen.

## Firestore Struktur

Das Frontend speichert die Nightscout-Konfiguration hier:

- `users/{uid}/settings/nightscout`

Dokumentfelder:

- `url` (string)
- `token` (string)
- `updatedAt` (timestamp)

## Firestore Security Rules (Beispiel)

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## Nightscout API

Verwendeter Endpoint:

- `/api/v2/entries.json?count=<limit>&token=<token>`

## Sicherheit

- Firebase-Konfigurationswerte (`VITE_FIREBASE_*`) sind öffentlich und kein Secret.
- Auch ein Nightscout-Token in Firestore ist für den eingeloggten Besitzer im Browser auslesbar.
- Für deinen Single-User-Use-Case ist das meist ausreichend.
- Für echte Secret-Isolation brauchst du ein Backend/Proxy (z. B. Firebase Functions).
