# Offertanalys - Plattformsdokumentation

## Översikt

**Projektnamn:** Offertanalys
**Organisation:** Installationsbolaget Stockholm AB
**Typ:** Next.js fullstack-webbapplikation för analys och jämförelse av VVS-offerter
**Språk:** TypeScript, React 19 med Next.js 16
**Status:** Aktiv utveckling

---

## Syfte

Offertanalys är en AI-driven plattform designad för svenska VVS-entreprenörer att:
- **Samla in offerter** från flera leverantörer i strukturerat format
- **Extrahera data automatiskt** från PDF- och Excel-offerter med AI
- **Jämföra offerter intelligent** med hänsyn till olika scope och specifikationer
- **Utvärdera leverantörer** baserat på pris, leveransvillkor och teknisk uppfyllnad
- **Dokumentera beslut** och spåra projektstatus

---

## Teknisk Stack

### Frontend
| Teknologi | Version | Användning |
|-----------|---------|------------|
| Next.js | 16.1.1 | App Router, SSR |
| React | 19.2.3 | UI-komponenter |
| TypeScript | 5.x | Typsäkerhet |
| Tailwind CSS | 4.x | Styling |
| Lucide React | 0.562.0 | Ikoner |

### Backend & Databas
| Teknologi | Användning |
|-----------|------------|
| Supabase | PostgreSQL-databas + fillagring |
| Next.js API Routes | REST API-endpoints |

### AI & Filhantering
| Teknologi | Användning |
|-----------|------------|
| Anthropic Claude (Opus 4.5) | Offertanalys & jämförelse |
| pdf-parse / unpdf | PDF-textextraktion |
| xlsx | Excel-filparsning |
| react-pdf | PDF-visning |

---

## Projektstruktur

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API-endpoints
│   │   ├── auth/                 # PIN-autentisering
│   │   ├── projects/             # Projekthantering
│   │   ├── categories/           # Offertkategorier
│   │   ├── quotes/               # Offerthantering
│   │   │   ├── analyze/          # Enskild offertanalys
│   │   │   ├── analyze-batch/    # Batchanalys
│   │   │   └── upload/           # Filuppladdning
│   │   ├── compare/              # Offertjämförelse
│   │   ├── comparisons/          # Sparade jämförelser
│   │   ├── specifications/       # Tekniska specifikationer
│   │   ├── todos/                # Projektuppgifter
│   │   └── files/                # Filhantering
│   ├── dashboard/                # Projektöversikt
│   └── project/[id]/             # Projektdetaljer
│       └── category/[categoryId]/ # Kategorisida
├── components/
│   ├── auth/                     # Inloggningskomponenter
│   ├── quotes/                   # Offertkomponenter
│   ├── analysis/                 # Analysvisning
│   ├── specifications/           # Specifikationskomponenter
│   ├── excel/                    # Excel-visare
│   ├── pdf/                      # PDF-visare
│   └── ui/                       # Generella UI-komponenter
└── lib/
    ├── claude.ts                 # Claude API-integration
    ├── supabase.ts               # Databasklient
    ├── storage.ts                # Fillagringsoperationer
    └── parsers/                  # Fil-parsers
```

---

## Databasschema

### Kärnentiteter

#### 1. projects (Projekt)
```sql
- id: UUID (primärnyckel)
- name: string (obligatorisk)
- project_number: string (frivillig)
- address: string (frivillig)
- client: string (frivillig)
- description: string (frivillig)
- created_at, updated_at: timestamps
```

#### 2. quote_categories (Offertkategorier)
```sql
- id: UUID
- project_id: UUID (FK → projects)
- name: string
- description: string
- selected_quote_id: UUID (vinnande offert)
- created_at: timestamp
```

#### 3. quotes (Offerter)
```sql
- id: UUID
- category_id: UUID (FK → quote_categories)
- supplier_name: string
- quote_number, quote_date, valid_until
- contact_person, contact_email, contact_phone
- total_amount: number
- currency: string (standard 'SEK')
- vat_included: boolean
- payment_terms, delivery_terms, warranty_period
- file_path: string (Supabase Storage)
- extracted_text: text
- ai_summary: string
- ai_analysis: JSONB (strukturerad Claude-analys)
- status: 'pending' | 'analyzed' | 'received' | 'reviewing' | 'selected' | 'rejected'
- notes: string
```

#### 4. quote_items (Offertposter)
```sql
- id: UUID
- quote_id: UUID (FK → quotes)
- position, article_number: string
- description: string (obligatorisk)
- quantity, unit_price, discount_percent: number
- net_price, total_amount: number
- item_type: 'product' | 'accessory' | 'service' | 'option'
- product_category: string
- specifications: JSONB
```

#### 5. specifications (Tekniska specifikationer)
```sql
- id: UUID
- project_id: UUID (FK → projects)
- category_id: UUID (frivillig)
- name: string
- file_path: string
- extracted_text: text
- requirements: JSONB
```

#### 6. comparisons (Jämförelser)
```sql
- id: UUID
- category_id: UUID (unik, en jämförelse per kategori)
- specification_id: UUID (frivillig)
- quote_ids: UUID[] (jämförda offerter)
- result: JSONB (fullständig Claude-analys)
```

#### 7. project_todos (Projektuppgifter)
```sql
- id: UUID
- project_id: UUID
- title, description: string
- completed: boolean
- priority: 'low' | 'medium' | 'high'
- due_date: date
- category_id: UUID (frivillig)
```

---

## Huvudfunktioner

### 1. Autentisering
- **PIN-baserad inloggning** med 4-siffrig kod
- HTTP-only cookies för sessionshantering
- 7 dagars sessionsgiltighet

### 2. Projekthantering
- Skapa projekt med metadata (namn, nummer, adress, kund)
- Dashboard med sökfunktion
- Spåra projektstatus och valda leverantörer
- Uppgiftshantering per projekt

### 3. Offerthantering
- **Filuppladdning:** Drag-and-drop för PDF och Excel
- **Automatisk textextraktion:** Parsers för båda format
- **OCR-fallback:** Claude Vision för skannade PDF:er
- **Statusspårning:** pending → analyzed → selected/rejected

### 4. AI-driven Offertanalys

#### Extraktionsprocess
Claude extraherar strukturerad data från offerttext:
- Leverantörsinformation (namn, org.nr, kontaktuppgifter)
- Offertmetadata (nummer, datum, giltighet)
- Betalnings-, leverans- och garantivillkor
- Enskilda poster med beskrivning, kvantitet, priser
- Totalsummor och vad som ingår/ej ingår

#### Jämförelseanalys
Intelligent jämförelse av 2+ offerter:
- **Scope-analys:** Identifierar produktkategorier, visar skillnader
- **Prisjustering:** Beräknar rättvist pris för jämförbara scope
- **Uppfyllandepoäng:** Utvärderar mot tekniska specifikationer
- **Rekommendation:** Bästa leverantör med motivering
- **Förhandlingspunkter:** Förslag på klargöranden med leverantörer

### 5. Specifikationshantering
- Ladda upp tekniska krav (PDF/Excel)
- Projekt- eller kategorinivå
- Automatisk textextraktion
- Används i jämförelseanalys

### 6. Filvisning
- Inbyggd PDF-visare (react-pdf)
- Inbyggd Excel-visare (kalkylbladsformat)
- Signerade URL:er för säker åtkomst

---

## API-endpoints

### Autentisering
| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| POST | `/api/auth` | Logga in med PIN |
| GET | `/api/auth` | Kontrollera autentisering |
| DELETE | `/api/auth` | Logga ut |

### Projekt
| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET | `/api/projects` | Lista alla projekt |
| POST | `/api/projects` | Skapa nytt projekt |

### Kategorier
| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET | `/api/categories?projectId=X` | Lista kategorier |
| POST | `/api/categories` | Skapa kategori |
| PATCH | `/api/categories` | Uppdatera (välj vinnare) |

### Offerter
| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET | `/api/quotes?categoryId=X` | Lista offerter |
| POST | `/api/quotes` | Skapa offert |
| PATCH | `/api/quotes` | Uppdatera offert |
| DELETE | `/api/quotes` | Ta bort offert |
| POST | `/api/quotes/analyze` | Analysera enskild offert |
| POST | `/api/quotes/analyze-batch` | Batchanalys |
| POST | `/api/quotes/upload` | Ladda upp offertfil |

### Jämförelser
| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET | `/api/comparisons?categoryId=X` | Hämta jämförelse |
| POST | `/api/comparisons` | Spara jämförelse |
| DELETE | `/api/comparisons?categoryId=X` | Ta bort jämförelse |

### Övrigt
| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET/POST | `/api/specifications` | Specifikationshantering |
| GET/POST/PATCH/DELETE | `/api/todos` | Uppgiftshantering |
| POST | `/api/files/process` | Extrahera text från fil |
| GET | `/api/files/view?path=X` | Ladda ner fil |

---

## Claude AI-integration

### Modell
- **claude-opus-4-5-20251101** (Opus 4.5)
- Max 32 000 tokens output
- Streaming API för långa svar

### Offertextraktion
Strukturerad JSON-prompt som extraherar:
```json
{
  "supplier": { "name", "org_number", "contact_person", ... },
  "quote": { "quote_number", "date", "validity_period", ... },
  "items": [{ "description", "quantity", "unit_price", ... }],
  "totals": { "subtotal", "vat", "total", ... },
  "terms": { "payment", "delivery", "warranty", ... },
  "inclusions": [...],
  "exclusions": [...]
}
```

### Jämförelseanalys
Genererar strukturerat resultat med:
- Executive summary
- Produktkategoriidentifiering per offert
- Scope-avvikelser och prisjusteringar
- Specifikationsuppfyllande (om tillhandahållet)
- För- och nackdelar per leverantör
- Slutrekommendation med motivering
- Frågor att ställa till leverantörer

---

## Design & Stil

### Färgschema (Mörkt tema)
| Färg | Hex | Användning |
|------|-----|------------|
| Bakgrund | #0a0f14 | Primär bakgrund |
| Primär | #06b6d4 (cyan) | Knappar, länkar |
| Framgång | #22c55e (grön) | Bekräftelser |
| Varning | #f59e0b (bärnsten) | Varningar |
| Fara | #ef4444 (röd) | Fel, borttagning |

### Responsiv design
- Mobile-first med breakpoints (sm, md, lg)
- Tailwind CSS utility-klasser
- Grid-layouts för kort och listor

---

## Miljövariabler

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>

# Anthropic Claude
ANTHROPIC_API_KEY=<claude-api-key>

# Autentisering
APP_PIN_CODE=1234
```

---

## Körning & Deployment

### Utveckling
```bash
npm install          # Installera beroenden
npm run dev          # Starta utvecklingsserver (port 3000)
```

### Produktion
```bash
npm run build        # Bygg för produktion
npm start            # Starta produktionsserver
npm run lint         # Kör linting
```

### Deployment
- Optimerad för Vercel
- Max API-requesttid: 60 sekunder

---

## Säkerhet

1. **Autentisering:** PIN-baserad med httpOnly cookies
2. **Fillagring:** Randomiserade sökvägar i Supabase Storage
3. **API-skydd:** Autentiseringskontroll på skyddade endpoints
4. **Typsäkerhet:** Strikt TypeScript genom hela kodbasen
5. **Inputvalidering:** Grundläggande validering på API-endpoints

---

## Senaste funktioner

1. **Excel/XLSX-visare:** Komponent för att visa Excel-offerter
2. **Streaming Claude API:** Hantering av långa requests
3. **Smart scope-analys:** Intelligent identifiering av produktkategorier
4. **Batchanalys:** Analysera flera offerter effektivt
5. **Specifikationslänkning:** Koppla tekniska krav till jämförelser

---

## Arbetsflöde

```
┌─────────────────────────────────────────────────────────────────┐
│                        OFFERTANALYS WORKFLOW                      │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
  │   1. SKAPA   │────▶│  2. LADDA    │────▶│   3. ANALYSERA   │
  │   PROJEKT    │     │  UPP OFFERTER│     │   MED AI         │
  └──────────────┘     └──────────────┘     └──────────────────┘
         │                    │                      │
         ▼                    ▼                      ▼
  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
  │ • Namn       │     │ • PDF/Excel  │     │ • Extrahera data │
  │ • Kund       │     │ • Drag-drop  │     │ • Strukturera    │
  │ • Adress     │     │ • Kategorier │     │ • Validera       │
  └──────────────┘     └──────────────┘     └──────────────────┘
                                                     │
         ┌───────────────────────────────────────────┘
         ▼
  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
  │   4. JÄMFÖR      │────▶│  5. UTVÄRDERA    │────▶│   6. VÄLJ    │
  │   OFFERTER       │     │  LEVERANTÖRER    │     │   VINNARE    │
  └──────────────────┘     └──────────────────┘     └──────────────┘
         │                        │                       │
         ▼                        ▼                       ▼
  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
  │ • Scope-analys   │     │ • Prisjämförelse │     │ • Dokumentera│
  │ • Prisjustering  │     │ • Spec-uppfyllnad│     │ • Spåra      │
  │ • AI-rekommend.  │     │ • För/nackdelar  │     │ • Rapportera │
  └──────────────────┘     └──────────────────┘     └──────────────┘
```

---

## Sammanfattning

Offertanalys är en specialbyggd plattform för svenska VVS-företag som automatiserar och intelligentifierar offerthantering. Genom att kombinera:

- **Modern webbteknologi** (Next.js, React, TypeScript)
- **Molnbaserad infrastruktur** (Supabase)
- **Avancerad AI** (Claude Opus 4.5)

...skapas en lösning som sparar tid, minskar fel och ger bättre beslutsunderlag vid leverantörsval.

**Huvudfördelar:**
- Automatisk dataextraktion från offerter
- Intelligent jämförelse med scope-justering
- Svenskanpassad för VVS-branschens behov
- Skalbar och säker arkitektur
- Användarvänligt gränssnitt

---

*Dokumentation genererad: 2025-12-31*
