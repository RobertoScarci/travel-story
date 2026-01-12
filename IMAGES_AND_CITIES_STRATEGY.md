# Strategia per Immagini e Nuove Città

## Problema Attuale

1. **Unsplash ha limiti**: 50 richieste/ora (free tier)
2. **Aggiungere nuove città**: bisogno di un metodo sistematico
3. **Pagina Admin**: ora inutile dato che tutto è automatico

## Soluzione Immagini: Multi-Source con Fallback

### Opzione 1: Pexels API (Raccomandato)
- **Gratuita**: 200 richieste/ora (4x più di Unsplash!)
- **Alta qualità**: Foto professionali
- **Facile integrazione**: API simile a Unsplash
- **No attribuzione richiesta** per uso commerciale
- **Registrazione**: Gratuita su pexels.com/api

### Opzione 2: Pixabay API
- **Gratuita**: Illimitata (più lenta)
- **Vasta collezione**: 4+ milioni di immagini
- **No attribuzione richiesta**
- **Registrazione**: Gratuita su pixabay.com/api

### Opzione 3: Wikipedia Images (Già disponibile)
- **Gratuita**: Nessun limite
- **Già integrato**: WikipediaService può fornire immagini
- **Qualità variabile**: Dipende dalla città

### Strategia Multi-Source
1. **Prima prova**: Unsplash (se disponibile)
2. **Fallback 1**: Pexels (200 req/ora)
3. **Fallback 2**: Wikipedia (già integrato)
4. **Fallback 3**: Pixabay (se necessario)
5. **Fallback finale**: Immagine generica

## Aggiungere Nuove Città

### Opzione 1: GeoNames API (Raccomandato)
- **Gratuita**: Nessun limite per uso base
- **Dati completi**: Nome, coordinate, paese, popolazione
- **Richiede registrazione**: Gratuita su geonames.org
- **API endpoint**: `http://api.geonames.org/searchJSON?`

**Vantaggi**:
- Può cercare città per nome/paese
- Fornisce coordinate precise
- Dati ufficiali

### Opzione 2: Lista Manuale Estesa
- **Più controllo**: Scegli esattamente quali città aggiungere
- **Nessuna dipendenza API**: Funziona offline
- **Coordinazione manuale**: Deve essere fatta a mano

### Opzione 3: Dataset Pubblici
- **World Cities Database**: Dataset CSV/JSON pubblico
- **Completo**: Migliaia di città
- **Richiede parsing**: Integrazione manuale

## Raccomandazione

### Per le Immagini:
1. **Integrare Pexels API** come fallback principale
2. **Usare Wikipedia** per immagini già disponibili
3. **Mantenere Unsplash** come prima scelta (se disponibile)
4. **Implementare cache** per evitare richieste duplicate

### Per le Città:
1. **Espandere lista manuale** con più città popolari
2. **Integrare GeoNames** per ricerca dinamica (opzionale)
3. **Mantenere struttura attuale** (CitySeederService)

## Pagina Admin

**Raccomandazione**: **ELIMINARE** o trasformare in utility per:
- Verifica stato database
- Log di seeding
- Statistiche città
- Ma NON per operazioni manuali (tutto automatico ora)

