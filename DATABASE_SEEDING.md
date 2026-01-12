# Sistema di Database e Seeding Automatico

## Panoramica

Il sistema è stato migliorato con un database persistente (IndexedDB) e un servizio di seeding automatico che popola il database con città arricchite da multiple API esterne.

## Componenti Principali

### 1. DatabaseService (`database.service.ts`)
- Gestisce la persistenza dei dati usando **IndexedDB** (con fallback a localStorage)
- Operazioni CRUD complete per le città
- Ricerca e filtraggio
- Inizializzazione automatica del database

### 2. CitySeederService (`city-seeder.service.ts`)
- Popola automaticamente il database con città arricchite
- Usa multiple API per ottenere dati completi:
  - **Unsplash**: Immagini garantite per tutte le città (con fallback)
  - **Wikipedia**: Descrizioni e informazioni dettagliate
  - **RestCountries**: Dati paese (valuta, lingua, timezone, ecc.)
- Lista di **80+ città popolari** da seedare automaticamente

### 3. CityService (aggiornato)
- Carica automaticamente i dati dal database all'avvio
- Fallback a mock data se il database è vuoto
- Metodo `refreshCities()` per aggiornare i dati dal database

## Come Usare

### Seeding del Database

1. **Vai alla pagina Admin** (`/admin`)
2. **Clicca su "Seeda Tutto il Database"**
3. Il processo:
   - Arricchisce ogni città con dati da API
   - Garantisce immagini per tutte le città
   - Salva tutto nel database
   - Mostra progresso in tempo reale

### Verifica Stato Database

- Clicca su "Verifica Stato Database" per vedere quante città sono nel database

### Popolare Immagini Mancanti

- Usa "Popola Immagini Mancanti" per aggiornare solo le immagini delle città esistenti

## Città Incluse

Il sistema include **80+ città** da tutti i continenti:

- **Europa**: Roma, Parigi, Londra, Barcellona, Amsterdam, Berlino, Vienna, Praga, Budapest, Lisbona, Atene, Firenze, Venezia, Milano, Edimburgo, Dublino, Stoccolma, Copenaghen, Oslo, Helsinki, Zurigo, Bruxelles, Varsavia, Cracovia, Reykjavik
- **Asia**: Tokyo, Seoul, Bangkok, Singapore, Dubai, Istanbul, Hong Kong, Pechino, Shanghai, Delhi, Mumbai, Bali, Giacarta, Kuala Lumpur, Manila, Ho Chi Minh, Hanoi, Taipei
- **Africa**: Cairo, Cape Town, Marrakech, Casablanca, Nairobi, Lagos, Tunis
- **Oceania**: Sydney, Melbourne, Auckland, Wellington, Brisbane
- **Nord America**: New York, Los Angeles, San Francisco, Chicago, Miami, Las Vegas, Toronto, Montreal, Vancouver, Mexico City, Cancun
- **Sud America**: Buenos Aires, Rio de Janeiro, San Paolo, Lima, Santiago, Bogotà, Cartagena, Quito

## Dati Arricchiti

Ogni città viene arricchita con:

- ✅ **Immagini** (thumbnail + hero) da Unsplash (garantite)
- ✅ **Tagline** da Wikipedia
- ✅ **Tags** basati su continente e descrizione
- ✅ **Rating** realistico (4.0-4.8)
- ✅ **Popularity Score** (50-95)
- ✅ **Price Level** (1-5) basato su paese
- ✅ **Best Period** per visitare
- ✅ **Suggested Days** (min/max)
- ✅ **Timezone** dal paese
- ✅ **Language** dal paese
- ✅ **Currency** dal paese
- ✅ **Emergency Number** per paese

## Note Tecniche

- Il seeding può richiedere **diversi minuti** (200ms di delay tra ogni città per evitare rate limiting)
- Le immagini sono **sempre garantite** (fallback a immagine generica se Unsplash fallisce)
- Il database usa **IndexedDB** per storage persistente (fallback a localStorage se non disponibile)
- Tutti i dati vengono salvati localmente nel browser

## API Utilizzate

- **Unsplash**: Immagini ad alta qualità (50 req/ora - free tier)
- **Wikipedia REST API**: Descrizioni e informazioni (gratuita, no key)
- **RestCountries API**: Dati paese (gratuita, no key)

## Prossimi Passi

- Aggiungere più città alla lista
- Implementare sincronizzazione con backend (quando disponibile)
- Aggiungere cache per ridurre chiamate API
- Implementare aggiornamento incrementale delle città esistenti

