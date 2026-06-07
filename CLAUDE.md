# Planlama App — CLAUDE.md

Kişisel hayat planlama uygulaması. Google servisleriyle entegre, CEO ajan mimarisine sahip, tamamen Türkçe web uygulaması.

---

## Geliştirme Agent Ekosistemi

Bu bölüm, projeyi **inşa ederken** kullanılacak Claude Code agent'larını ve geliştirme iş akışını tanımlar.

### Çalışma Modu

- **Default:** Pair programming — her karar için plan sunar, onaydan sonra uygular
- **Otonom mod:** Kullanıcı açıkça "kararları sana bırakıyorum" veya benzer bir ifade kullandığında agent tüm kararları alır, direkt uygular
- **Otomatik code review:** Her önemli değişiklikten sonra Code Review Agent devreye girer
- **Test:** Her kritik akış implementasyonundan sonra unit testler yazılır

---

### Geliştirme Agent'ları

#### 1. UI/UX Design Agent
**Tetik:** Yeni sayfa, bileşen veya önemli UI değişikliği

**Sorumluluklar:**
- Sayfanın implementasyon planını oluşturur (layout, bileşen hiyerarşisi, state yapısı)
- Tailwind CSS + shadcn/ui ile component yazar
- Renk, tipografi ve spacing kararlarını verir
- Accessibility (WCAG) ve responsive tasarım kontrolü yapar

**Çalışma akışı:**
```
Kullanıcı: "Dashboard sayfasını yap"
    → Agent: Implementasyon planı sunar (wireframe seviyesinde açıklama)
    → Kullanıcı onaylar
    → Agent: Next.js + Tailwind + shadcn kodu yazar
    → Code Review Agent otomatik devreye girer
```

**Claude Code Skill:** `ui-ux-designer` (mevcut built-in) + özel geliştirmeler

---

#### 2. AI / Agent System Agent
**Tetik:** CEO agent veya herhangi bir sub-agent kodu yazılacağında; prompt mühendisliği gerektiğinde

**Sorumluluklar:**
- CEO orchestrator mantığını geliştirir
- Sub-agent promptlarını yazar ve optimize eder
- `AgentReport` / `AgentTask` protokollerini implement eder
- Agent akışlarını (planning, me-time) test eder
- Streaming (SSE) endpoint'lerini geliştirir

**Çalışma akışı:**
```
Kullanıcı: "Planning Agent'ı implement et"
    → Agent: Prompt tasarımı + Python kodu için plan sunar
    → Onay sonrası: agents/planning_agent.py yazar
    → Prompt etkinliğini mock verilerle test eder
```

---

#### 3. Supabase Agent
**Tetik:** Veritabanı şeması değişikliği, yeni tablo, RLS politikası, sorgu optimizasyonu

**Sorumluluklar:**
- SQL migration dosyaları oluşturur
- RLS (Row Level Security) politikalarını yazar
- Supabase API key üzerinden şema doğrulaması yapar
- Supabase client kodunu (Python + JS) geliştirir
- İndeks önerileri ve sorgu optimizasyonu

**Çalışma akışı:**
```
Kullanıcı: "me_time_profiles tablosunu oluştur"
    → Agent: SQL migration planı sunar
    → Onay sonrası: migration dosyası yazar + Supabase API ile uygular
    → Python model ve JS type'larını günceller
```

**Araçlar:** Supabase REST API (kullanıcının API key'i), `supabase-py`, Supabase JS client

---

#### 4. Vercel Agent
**Tetik:** Deployment yapılandırması, environment variable yönetimi, build hatası, middleware/edge function

**Sorumluluklar:**
- `vercel.json` konfigürasyonu
- Environment variable şeması (`.env.example` güncel tutar)
- Build hatalarını analiz eder, çözüm sunar
- Vercel middleware ve edge function'lar

**Çalışma akışı:**
```
Kullanıcı: "Vercel'e deploy et / deploy hatası var"
    → Agent: Build logunu analiz eder
    → Vercel CLI komutlarıyla deploy sürecini yönetir
    → Env variable eksiklerini tespit eder
```

**Araçlar:** Vercel CLI (`vercel`, `vercel env`), GitHub Actions

---

#### 5. fal.ai Görsel Üretim Agent
**Tetik:** Me Time öneri kartları için görsel üretimi; aktivite fotoğrafı gerektiğinde

**Sorumluluklar:**
- Aktivite/mekan için prompt üretir ve fal.ai API'ye gönderir
- Üretilen görseli optimize eder (boyut, format)
- Görseli Supabase Storage veya Vercel Blob'a yükler
- Me Time kartlarında kullanılacak URL döner
- Prompt şablonlarını geliştirir (konser, park, kafe, spor gibi kategoriler için)

**Çalışma akışı:**
```
Me Time Agent → 5 aktivite önerisi üretir
    → fal.ai Agent: Her aktivite için görsel prompt yazar
    → fal.ai API'den görseller üretilir (FLUX model)
    → Storage'a yüklenir, URL'ler Me Time kartlarına bağlanır
```

**Model:** fal.ai FLUX (veya SDXL) — lifestyle/aktivite fotografik görseller için optimize

---

#### 6. Google Integration Agent *(önerilen ek)*
**Tetik:** Google API ile ilgili her entegrasyon (OAuth, Calendar, Gmail, Sheets, Drive, Maps)

**Sorumluluklar:**
- Google OAuth 2.0 akışını implement eder (token alma, yenileme, revoke)
- `services/google/` altındaki tüm API wrapper'ları geliştirir
- API rate limiting ve hata yönetimi
- Token güvenliği (refresh token şifreli saklanır)
- Google API kota takibi

**Çalışma akışı:**
```
Kullanıcı: "Gmail entegrasyonunu yaz"
    → Agent: Gmail API wrapper + hata yönetimi planı sunar
    → services/google/gmail.py yazar
    → Gmail Agent'ın kullanacağı interface'i tanımlar
```

---

#### 7. Backend / API Development Agent *(önerilen ek)*
**Tetik:** FastAPI endpoint'i, Python servis kodu, async iş akışı, middleware

**Sorumluluklar:**
- FastAPI router ve endpoint'leri yazar
- Pydantic model tanımlamaları
- Async/await pattern'leri doğru kullanır
- API hata yönetimi ve response format standartları
- SSE streaming endpoint'leri

**Çalışma akışı:**
```
Kullanıcı: "Plan onay endpoint'ini yaz"
    → Agent: endpoint tasarımı + Pydantic modeller için plan sunar
    → api/plan.py yazar
    → Unit test yazar (TestClient ile)
```

---

#### 8. Debug & Log Analysis Agent *(önerilen ek)*
**Tetik:** Hata, stack trace, beklenmedik davranış, performans sorunu

**Sorumluluklar:**
- Stack trace'i analiz eder, kök nedeni tespit eder
- Backend loglarını (Railway, uvicorn) okur
- Vercel runtime hatalarını analiz eder
- Supabase sorgu hatalarını çözer
- Claude API hatalarını (rate limit, token limit, refusal) yönetir

**Çalışma akışı:**
```
Kullanıcı: "Şu hata var: [stack trace]"
    → Agent: Hatanın kaynağını tespit eder
    → Fix planı sunar (veya otonom modda direkt düzeltir)
    → Aynı hatanın tekrarını önlemek için guard ekler
```

---

### Otomatik Workflow Kuralları

#### Code Review Hook
Her önemli değişiklikten sonra otomatik tetiklenir:
```bash
# Claude Code settings.json'a eklenecek hook
# Değişiklik sonrası /code-review --fix çalışır
```
Review kapsamı: güvenlik açıkları, performans, kod kalitesi, Türkçe UI tutarlılığı

#### Test Yazma Kuralı
Aşağıdaki her implementasyondan sonra unit test yazılır:
- Tüm FastAPI endpoint'leri (TestClient)
- Agent orchestration mantığı (mock Claude API)
- Google API wrapper'ları (mock responses)
- Supabase sorguları (test DB)

#### Commit Mesajı Standardı
```
feat(agent): Gmail Agent email parsing implement edildi
fix(calendar): Token refresh race condition düzeltildi
feat(me-time): fal.ai görsel üretim entegrasyonu
feat(supabase): me_time_profiles migration eklendi
```

---

### Agent Seçim Rehberi

| Görev | Kullanılacak Agent |
|---|---|
| Yeni sayfa veya bileşen | UI/UX Design Agent |
| CEO veya sub-agent kodu | AI/Agent System Agent |
| FastAPI endpoint, Python servisi | Backend/API Development Agent |
| Tablo, migration, RLS, sorgu | Supabase Agent |
| Google OAuth, Gmail, Calendar vb. | Google Integration Agent |
| Deploy, env var, build hatası | Vercel Agent |
| Me Time aktivite görseli | fal.ai Görsel Üretim Agent |
| Hata, stack trace, performans | Debug & Log Analysis Agent |
| Değişiklik sonrası kalite kontrolü | Code Review (otomatik) |

---

### Paralel Çalışma Senaryoları

**Bağımsız görevlerde paralel:**
```
Örnek: "Dashboard sayfasını ve plan endpoint'ini yaz"
    ├─► UI/UX Design Agent → Dashboard.tsx
    └─► Backend Agent → api/plan.py
    → Tamamlanınca birleştirilir
```

**Bağımlı görevlerde sıralı:**
```
Örnek: "Haftalık plan akışını implement et"
    1. Supabase Agent → weekly_plans tablosu oluşturur
    2. Backend Agent → Plan endpoint'leri yazar
    3. AI/Agent System Agent → Planning Agent implement eder
    4. UI/UX Design Agent → Plan sayfası yazar
```

---

### MCP Sunucuları

| MCP | Kullanım Alanı | Kurulum |
|---|---|---|
| Supabase MCP | Şema görüntüleme, tablo listesi, sorgu çalıştırma | `@supabase/mcp-server-supabase` |
| fal.ai | Görsel üretim API çağrıları | REST API (API key ile) |
| Google APIs | OAuth + servis çağrıları | `google-auth-library` |

---

---

## Vizyon

Kullanıcının Google Calendar, Gmail, Google Sheets ve Drive'ını okuyarak haftalık yaşam planı üreten; onay sonrası takvime işleyen; "Me Time" bölümüyle kişiselleştirilmiş aktivite + etkinlik öneren akıllı asistan.

---

## Tech Stack

| Katman | Teknoloji | Neden |
|---|---|---|
| Frontend | Next.js 14 (TypeScript, App Router) | SSR, streaming, server actions |
| UI | Tailwind CSS + shadcn/ui | Hızlı geliştirme, tutarlı bileşen seti |
| Backend | Python FastAPI | Async, AI kütüphaneleri, Google client'ları |
| Veritabanı | Supabase (PostgreSQL + Auth) | Realtime, kolay OAuth entegrasyonu |
| AI | Claude API (Anthropic) | CEO + sub-agent orchestration |
| Deploy | Vercel (frontend) + Railway (backend) | GitHub CI/CD, ücretsiz tier |
| State | React Query (TanStack Query) | Server state yönetimi |
| Gerçek Zamanlı | SSE (Server-Sent Events) | Agent yanıtlarını stream etmek için |

---

## Proje Yapısı

```
planlama-app/
├── frontend/                    # Next.js 14
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/           # Google OAuth giriş
│   │   ├── dashboard/           # Ana sayfa: haftalık özet
│   │   ├── chat/                # CEO agent chat arayüzü
│   │   ├── me-time/
│   │   │   ├── profile/         # Kullanıcı Me Time profili
│   │   │   └── suggestions/     # Öneri listesi
│   │   ├── plan/
│   │   │   ├── weekly/          # Haftalık plan görünümü + düzenleme
│   │   │   └── approve/         # Onay ekranı
│   │   └── settings/            # Kullanıcı ayarları, bağlı hesaplar
│   ├── components/
│   │   ├── chat/                # ChatWindow, MessageBubble, StreamingText
│   │   ├── calendar/            # WeeklyCalendar, EventCard, DragDrop
│   │   ├── me-time/             # ProfileForm, SuggestionCard
│   │   └── ui/                  # shadcn bileşenleri
│   ├── lib/
│   │   ├── api.ts               # Backend API client
│   │   └── auth.ts              # Google OAuth helpers
│   └── hooks/
│       ├── useChat.ts
│       └── usePlan.ts
│
├── backend/                     # Python FastAPI
│   ├── agents/
│   │   ├── ceo_agent.py         # Orchestrator — kullanıcıyla konuşur
│   │   ├── gmail_agent.py       # Mail okur, görev çıkarır
│   │   ├── calendar_agent.py    # Takvim okur/yazar
│   │   ├── sheets_agent.py      # Yapılacaklar okur (serbest format)
│   │   ├── drive_agent.py       # Drive dosyaları
│   │   ├── planning_agent.py    # Haftalık plan üretir
│   │   ├── me_time_agent.py     # Aktivite önerileri üretir
│   │   ├── location_agent.py    # Maps + etkinlik API'leri
│   │   └── traffic_agent.py     # Trafik süresi hesaplar (plan + me-time)
│   ├── services/
│   │   ├── google/
│   │   │   ├── auth.py          # OAuth token yönetimi
│   │   │   ├── calendar.py      # Calendar API wrapper
│   │   │   ├── gmail.py         # Gmail API wrapper
│   │   │   ├── sheets.py        # Sheets API wrapper
│   │   │   └── drive.py         # Drive API wrapper
│   │   └── external/
│   │       ├── maps.py          # Google Maps Places API (mekan keşfi)
│   │       ├── traffic.py       # Routes/Distance Matrix API (trafik süresi)
│   │       ├── eventbrite.py    # Eventbrite API
│   │       └── meetup.py        # Meetup API
│   ├── models/
│   │   ├── user.py              # Kullanıcı modeli
│   │   ├── plan.py              # Haftalık plan modeli
│   │   ├── task.py              # Görev modeli
│   │   └── me_time_profile.py   # Me Time profil modeli
│   ├── api/
│   │   ├── chat.py              # SSE streaming endpoint
│   │   ├── plan.py              # Plan CRUD endpoint'leri
│   │   ├── me_time.py           # Me Time endpoint'leri
│   │   └── auth.py              # Token yenileme
│   ├── core/
│   │   ├── config.py            # Ortam değişkenleri
│   │   └── orchestrator.py      # Agent iletişim protokolü
│   └── main.py
│
└── docs/
    └── api.md
```

---

## Agent Mimarisi

### CEO Agent (Orkestratör)

**Model:** `claude-opus-4-8`
**Görev:** Kullanıcının tek muhatabı. Hangi alt ajanın çalışacağına karar verir, sonuçları toplar, Türkçe sunar.

**Yetenekler:**
- Kullanıcı niyetini analiz etme (haftalık plan mı, Me Time mı, takvim sorgusu mu)
- Alt ajanları paralel veya sıralı çalıştırma
- Çakışma tespiti ve çözüm önerileri
- Onay akışı yönetimi (plan göster → düzenle → onayla → takvime yaz)
- Tüm alt ajanlardan gelen raporu sentezleyip kullanıcıya sunma

**Sistem Promptu İlkeleri:**
- Her zaman Türkçe yanıt ver
- Belirsizlik varsa kullanıcıya sor
- Alt ajan hatalarında kullanıcıyı bilgilendir, alternatif sun
- Plan önerirken "neden" açıkla (hangi görev, hangi mail nedeniyle)

### Alt Ajanlar

| Ajan | Model | Sorumluluk | CEO'ya rapor |
|---|---|---|---|
| Gmail Agent | `claude-haiku-4-5` | Son 7-14 günün maillerini tarar, aksiyon gerektiren maddeleri çıkarır | `{tasks: [], deadlines: [], context: ""}` |
| Sheets Agent | `claude-haiku-4-5` | "Yapılacaklar" dosyasını serbest formatta okur, yapılandırılmış görev listesi çıkarır | `{tasks: [], categories: [], priorities: []}` |
| Calendar Agent | `claude-haiku-4-5` | Takvim okur (müsait slot'ları bulur), onaylanan planları yazar | `{free_slots: [], existing_events: [], written: bool}` |
| Drive Agent | `claude-haiku-4-5` | İlgili Drive dosyalarına erişir, bağlam sağlar | `{relevant_files: [], context: ""}` |
| Planning Agent | `claude-sonnet-4-6` | Gmail + Sheets + Calendar çıktısını alır, optimize haftalık plan üretir | `{plan: WeeklyPlan, reasoning: ""}` |
| Me Time Agent | `claude-sonnet-4-6` | Kullanıcı profilini alır, aktivite kategorileri + fikirler üretir | `{activities: [], reasoning: ""}` |
| Location Agent | `claude-haiku-4-5` | Me Time Agent çıktısını alır, Maps + etkinlik API'lerinden somut mekan/etkinlik + trafik süresi getirir | `{venues: [], events: [], maps_links: [], travel_times: []}` |
| Traffic Agent | `claude-haiku-4-5` | Görevler arasındaki konum geçişlerinde Distance Matrix API ile trafik süresi hesaplar, Planning Agent'a tampon zaman bilgisi verir | `{legs: [{from, to, duration_min, traffic_min}]}` |

### Agent İletişim Protokolü

```python
# Her alt ajan bu yapıda CEO'ya rapor verir
class AgentReport(BaseModel):
    agent_name: str
    status: Literal["success", "partial", "failed"]
    result: dict          # ajan çıktısı
    confidence: float     # 0.0 - 1.0
    duration_ms: int
    errors: list[str]     # varsa hata listesi
    suggestions: list[str] # CEO için öneriler
```

```python
# CEO bu yapıyla alt ajan çağırır
class AgentTask(BaseModel):
    agent_name: str
    instruction: str      # ne yapmasını istiyoruz
    context: dict         # gerekli bağlam
    priority: int         # paralel çalışma önceliği
    timeout_sec: int
```

### Çalışma Akışı: Haftalık Plan

```
Kullanıcı: "Bu haftayı planla"
    │
    ▼
CEO Agent (niyet analizi)
    │
    ├─► [Paralel]
    │   ├─► Gmail Agent    → görevler + deadline'lar
    │   ├─► Sheets Agent   → yapılacaklar listesi
    │   └─► Calendar Agent → müsait slotlar + mevcut konumlu etkinlikler
    │
    ▼
Traffic Agent
    → Konumlu görevler arasındaki geçişlerde Distance Matrix API çağrısı
    → Her geçiş için: tahmini süre + mevcut trafik durumu + tampon zaman önerisi
    │
    ▼
Planning Agent
    → Tüm input'ları + trafik tamponlarını alır
    → Konumlu görevlere gidiş-dönüş süresi dahil slot atar
    → Trafik nedeniyle sıkışan günleri tespit eder, uyarı ekler
    │
    ▼
CEO Agent (planı kullanıcıya sunar)
    → Her konumlu görevde: "Önceki etkinlikten ~20 dk trafik var, 14:00'da yola çık"
    → Trafik riski yüksek geçişleri vurgular
    │
    ├─► Kullanıcı düzenler (drag-drop, saat değişikliği)
    │
    ▼
CEO Agent (onay alır)
    │
    ▼
Calendar Agent (Google Calendar'a yazar)
    │
    ▼
CEO Agent: "Plan takvime eklendi ✓"
```

### Çalışma Akışı: Me Time

```
Kullanıcı: "Bu hafta sonu için Me Time planla"
    │
    ▼
CEO Agent → Me Time profili tam mı? (DB sorgusu)
    │
    ├── Eksik var → Sadece eksik soruları sor
    │
    ▼
Me Time Agent (profil + zaman aralığı → aktivite fikirleri)
    │
    ▼
Location Agent [Paralel]
    ├─► Google Maps Places API (yakın mekanlar)
    ├─► Eventbrite API (etkinlikler)
    └─► Meetup API (sosyal etkinlikler)
    │
    ▼
Traffic Agent
    → Kullanıcının mevcut konumu (ev/iş) → her önerilen mekan arası mesafe
    → Distance Matrix API: trafik dahil tahmini süre
    → Her öneri kartına "~18 dk / trafik: orta" bilgisi eklenir
    │
    ▼
CEO Agent (zenginleştirilmiş öneri listesini sunar)
    → Her kart: Aktivite | Mekan | Fiyat | Süre | Trafik dahil ulaşım süresi
    │
    ├─► Kullanıcı seçer
    │
    ▼
Calendar Agent (seçilen aktiviteyi takvime ekler)
    → Yola çıkış saati otomatik hesaplanır ve hatırlatma olarak eklenir
```

---

## Google Entegrasyonları

### Gerekli OAuth 2.0 Scope'ları

```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/spreadsheets.readonly
https://www.googleapis.com/auth/drive.readonly
```

### Google Maps Platform API'leri

| API | Kullanım | Tetikleyen Agent |
|---|---|---|
| Places API (Nearby Search) | Me Time mekan keşfi | Location Agent |
| Places API (Text Search) | Aktivite kategorisi → mekan listesi | Location Agent |
| Distance Matrix API | İki konum arası trafik dahil süre | Traffic Agent |
| Directions API | Rota detayı + adım adım yol tarifi | Traffic Agent |
| Geocoding API | Adres → koordinat dönüşümü | Traffic Agent, Location Agent |

**Traffic Agent giriş/çıkış formatı:**
```python
# Girdi
{"origin": "Beşiktaş, İstanbul", "destination": "Kadıköy, İstanbul", "departure_time": "now"}

# Çıktı
{"duration_min": 25, "duration_traffic_min": 38, "traffic_level": "heavy", "distance_km": 12.4}
```

**Kullanım senaryoları:**
- **Haftalık planda:** Saat 10:00 Beşiktaş toplantısı → Saat 14:00 Kadıköy randevusu arası geçiş → Traffic Agent trafik süresini hesaplar, 38 dk ise araya buffer eklenir, CEO kullanıcıyı uyarır
- **Me Time'da:** Kullanıcı ev konumunu profilinden alır → her önerilen mekana tahmini varış süresi kartlara eklenir

### Sheets Agent — Serbest Format Okuma Stratejisi

Kullanıcının Yapılacaklar dosyası herhangi bir formatta olabilir. Sheets Agent şu stratejiyi uygular:

1. Tüm spreadsheet içeriğini ham metin olarak çeker (tüm sayfalar)
2. Claude'a şu promptu verir: *"Bu içerik bir yapılacaklar listesi. Görevleri, öncelikleri, deadline'ları ve kategorileri çıkar. Belirsiz olanları da dahil et, confidence skoru ver."*
3. Yapılandırılmış JSON döner

### Gmail Agent — Mail Filtreleme Stratejisi

- Son 14 günün okunmamış + starred maillerini tarar
- "Action required", "FYI", "Deadline" tonu olan mailleri önceliklendirir
- Türkçe ve İngilizce konu satırlarını anlar
- Spam / newsletter / otomatik mailler hariç tutulur

---

## Me Time Profil Sistemi

### Profil Soruları (Kategoriler)

Yanıtlar **hard filtre değil**, ağırlıklı öneri skalasında kullanılır. Öneri yelpazesi kasıtlı olarak geniş tutulur.

**1. Kişilik & Sosyal Tercihi**
- İntravert ↔ Ekstravert spektrumu (1-10)
- Sosyal tercih: Yalnız / Arkadaşla / Aileyle / Karma
- Kalabalık yerlere tolerans (1-5)

**2. İlgi Alanları** *(çok seçimli, ağırlık atanır)*
- Sanat & Sergi | Müzik & Konser | Spor & Hareket | Yemek & Mutfak
- Doğa & Açık Hava | Teknoloji & Oyun | Okuma & Öğrenme
- El İşi & Yaratıcılık | Film & Tiyatro | Sosyal & Networking

**3. Aktivite Amacı** *(bu sefer ne hissetmek istiyorum?)*
- Dinlenmek & Şarj olmak
- Macera & Yeni deneyim
- Bir şeyler öğrenmek
- Sosyalleşmek
- Yaratıcılığımı kullanmak

**4. Fiziksel Durum**
- Fitness seviyesi (1-5: sedanter → aktif sporcu)
- Tercih edilen yoğunluk: Hafif / Orta / Yüksek
- Varsa kısıtlamalar (serbest metin)

**5. Pratik Bilgiler**
- Tek seferde me time süresi: 1-2 saat / 2-4 saat / Yarım gün / Tam gün
- Bütçe: Ücretsiz / 0-200₺ / 200-500₺ / 500₺+
- Tercih edilen zaman: Sabah / Öğleden sonra / Akşam

**6. Konum & Ulaşım**
- Şehir ve ilçe
- Araç var mı?
- Maksimum mesafe (km)
- İç mekan / Dış mekan tercihi
- Hava durumuna duyarlılık (1-5)

**7. Kaçınılacaklar** *(serbest metin)*
- Kullanıcının istemediği her şey burada

### Me Time Öneri Motoru

```
Kullanıcı profili + "bu sefer ne hissetmek istiyorum?" sorusu
    │
    ▼
Me Time Agent (claude-sonnet-4-6)
→ 5-8 aktivite kategorisi + fikir üretir
→ Her fikir için: neden uygun? + tahmini süre + bütçe aralığı
    │
    ▼
Location Agent [Paralel veri çekme]
    ├─► Google Maps Places API
    │   → Yakın mekanlar (maps_places_nearby)
    │   → Her aktivite için somut yer önerileri
    │
    ├─► Eventbrite API
    │   → Şehirdeki yaklaşan etkinlikler
    │   → Kategori filtresi (konser, sergi, workshop, fuar)
    │
    └─► Meetup API
        → Açık sosyal etkinlikler
        → Ücretsiz + ücretli seçenekler
    │
    ▼
CEO Agent → Kullanıcıya 5-8 kartlık öneri listesi
Kart içeriği: Aktivite adı | Mekan | Fiyat | Süre | Neden sana uygun?
```

### Etkinlik API'leri

| API | Kapsam | Fiyat | Not |
|---|---|---|---|
| Google Maps Places API | Mekan keşfi (kafe, park, müze, spor salonu) | Ücretsiz (kotaya kadar) | Zaten entegre |
| Ticketmaster Discovery API | Konser, spor, sanat, tiyatro — TR dahil | Ücretsiz (5000 istek/gün) | Birincil etkinlik kaynağı |
| Apify | Eventbrite, Biletix, Mobilet scraping | $5/ay ücretsiz kredi | TR etkinlikleri için; `apify/eventbrite-scraper` actor |
| Meetup API | Sosyal etkinlikler | Ücretli | Apify üzerinden scrape edilir |

**Ticketmaster API:** `developer.ticketmaster.com` → ücretsiz API key al, `TICKETMASTER_API_KEY` env'e ekle.

**Apify ücretsiz tier stratejisi:** $5/ay kredi ile haftada 1-2 scraping çalıştırması yapılır, sonuçlar Supabase'e cache'lenir — her öneri isteğinde yeniden scrape edilmez.

**Öncelik sırası:** Google Maps Places → Ticketmaster → Apify/Eventbrite → Apify/Biletix

---

## Haftalık Planlama Sistemi

### Plan Üretme Mantığı

Planning Agent şu girdiyi alır:
- Sheets Agent çıktısı (görevler + öncelikler)
- Gmail Agent çıktısı (eylem gerektiren mailler + deadline'lar)
- Calendar Agent çıktısı (müsait slotlar + mevcut randevular)
- Kullanıcı tercihleri: çalışma saatleri, mola sıklığı

Planning Agent şu çıktıyı üretir:
- Her göreve tahmini süre ataması
- Öncelik + deadline'a göre slot önerileri
- Çakışma tespiti
- Her önerinin gerekçesi ("Bu görevi Salı sabahına koydum çünkü...")

### Plan Düzenleme Arayüzü

- Haftalık takvim görünümü (sürükle-bırak)
- Görev kartı: ad, süre, öncelik, kaynak (mail mi? sheets mi?)
- Saat değiştirme, gün değiştirme, silme, ekleme
- "Tümünü onayla" butonu
- Kısmi onay (bazı görevleri onayla, bazılarını ertele)

### Otomatik Planlama Takvimi

- Kullanıcı haftanın herhangi bir gününü "planlama günü" seçer
- O gün sabahı otomatik plan hazırlanır, bildirim gelir
- CEO Chat'ten istediği zaman "Haftayı planla" diyerek manuel tetikleyebilir
- Gün değiştirilebilir: Ayarlar → Planlama Günü

---

## Veritabanı Şeması (Supabase)

```sql
-- Kullanıcılar
users (id, email, google_access_token, google_refresh_token, sheets_file_id, planning_day, created_at)

-- Haftalık planlar
weekly_plans (id, user_id, week_start_date, status[draft|approved|partial], created_at)

-- Plan görevleri
plan_tasks (id, plan_id, title, description, start_time, end_time, source[sheets|gmail|manual], priority, calendar_event_id, status[pending|approved|rejected], order)

-- Me Time profili
me_time_profiles (id, user_id, personality_score, social_preference, interests[], activity_goal, fitness_level, intensity_preference, constraints, duration_preference, budget_range, preferred_time, city, district, has_car, max_distance_km, indoor_outdoor, weather_sensitivity, avoidances, updated_at)

-- Me Time önerileri
me_time_suggestions (id, user_id, created_at, mood_input, activities[jsonb], selected_activity_id, calendar_event_id)

-- Agent logları
agent_logs (id, user_id, session_id, agent_name, instruction, result, duration_ms, status, created_at)
```

---

## API Endpoint'leri (FastAPI)

```
POST /api/chat/stream          → SSE: CEO agent ile sohbet (streaming)
GET  /api/plan/weekly          → Mevcut haftalık planı getir
POST /api/plan/generate        → Yeni haftalık plan üret
PATCH /api/plan/task/{id}      → Görev güncelle (saat, gün, silme)
POST /api/plan/approve         → Planı onayla → Calendar'a yaz
POST /api/plan/approve/{id}    → Tek görevi onayla

GET  /api/me-time/profile      → Mevcut profili getir
POST /api/me-time/profile      → Profil oluştur/güncelle
POST /api/me-time/suggest      → Yeni öneri üret (mood input + profil)
POST /api/me-time/add-to-calendar → Aktiviteyi takvime ekle

GET  /api/auth/google          → OAuth başlat
GET  /api/auth/callback        → OAuth callback
POST /api/auth/refresh         → Token yenile
```

---

## Frontend Sayfaları

### Dashboard (`/dashboard`)
- Bu haftanın özeti: kaç görev var, tamamlanan, kalan
- "Haftayı Planla" butonu → Planning akışı başlar
- "Me Time Planla" butonu → Me Time akışı başlar
- Takvim önizlemesi (mini haftalık görünüm)
- CEO Chat kısayolu

### CEO Chat (`/chat`)
- Full-page chat arayüzü
- Streaming mesajlar (SSE)
- Mesaj tiplerine göre farklı render: düz metin, plan kartları, öneri kartları
- Geçmiş konuşmalar

### Haftalık Plan (`/plan/weekly`)
- Sürükle-bırak haftalık takvim
- Sol panel: onaylanmamış görev listesi
- Sağ panel: takvim grid (Pzt-Paz, saatlik)
- Her görev kartı: renk kodu (kaynak bazlı), süre, öncelik
- "Tümünü Onayla" ve "Seçilileri Onayla" butonları

### Me Time Profili (`/me-time/profile`)
- Adım adım profil formu (multi-step wizard)
- Her bölüm ayrı kart: Kişilik, İlgi, Fiziksel, Pratik, Konum
- Mevcut yanıtlar her zaman düzenlenebilir
- Kaydet butonu her bölümde ayrı çalışır

### Me Time Önerileri (`/me-time/suggestions`)
- "Bu sefer nasıl hissetmek istiyorsun?" soru kartı
- 5-8 öneri kartı: fotoğraf placeholder, mekan adı, fiyat, süre, mesafe
- Her kartın altında: "Takvime Ekle" butonu + Google Maps linki
- Etkinlikler için: bilet linki + tarih/saat

---

## Ortam Değişkenleri

```bash
# Backend (.env)
ANTHROPIC_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
GOOGLE_MAPS_API_KEY=
EVENTBRITE_API_KEY=
MEETUP_API_KEY=
FRONTEND_URL=

# Frontend (.env.local)
NEXT_PUBLIC_BACKEND_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Kurulum ve Geliştirme

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

### Google Cloud Console Yapılandırması

1. Google Cloud Console → APIs & Services → Enable:
   - Gmail API
   - Google Calendar API
   - Google Sheets API
   - Google Drive API
   - Maps JavaScript API
   - Places API
2. OAuth 2.0 Credentials → Web application
3. Authorized redirect URIs: `http://localhost:8000/api/auth/callback`
4. Credentials hazır (kullanıcıda mevcut)

---

## Deployment

### Frontend → Vercel
```bash
# GitHub'a push → Vercel otomatik deploy
# Environment Variables: Vercel Dashboard'dan ekle
# Domain: vercel app domain veya custom domain
```

### Backend → Railway
```bash
# GitHub repo bağla → Railway otomatik deploy
# Procfile: web: uvicorn main:app --host 0.0.0.0 --port $PORT
# Environment Variables: Railway Dashboard'dan ekle
```

---

## İmplementasyon Yol Haritası — Güncel Durum (2026-06-07)

### ✅ Faz 1 — Temel Altyapı (TAMAMLANDI)
- [x] Supabase proje kurulumu + şema (3 migration)
- [x] FastAPI proje iskeleti + config
- [x] Next.js 14 proje iskeleti + shadcn/ui kurulumu
- [x] Google OAuth akışı (backend) — `prompt=consent`, `access_type=offline`
- [x] Frontend login sayfası + email/şifre signup
- [x] JWT session (30 gün) + httponly cookie

### ✅ Faz 2 — Google Entegrasyonları (TAMAMLANDI)
- [x] Gmail API wrapper — son 14 gün okunmamış + starred
- [x] Google Sheets API wrapper — serbest format, AI ile yapılandırma
- [x] Google Calendar API wrapper — okuma + yazma + boş slot bulma
- [x] Google Drive API wrapper — Sheets dosyası listeleme
- [x] `credentials_from_token_data()` — hem DB hem chat dict key isimlerini destekler
- [x] Timezone-safe datetime karşılaştırmaları

### ✅ Faz 3 — Agent Sistemi (TAMAMLANDI)
- [x] `AgentReport` / `AgentTask` protokolü (`core/orchestrator.py`)
- [x] Gmail Agent (claude-haiku) — görev + deadline çıkarımı
- [x] Sheets Agent (claude-haiku) — serbest format okuma
- [x] Calendar Agent (claude-haiku) — müsait slot bulma + konumlu etkinlikler
- [x] Traffic Agent (claude-haiku) — Distance Matrix API
- [x] Planning Agent (claude-sonnet) — TÜM görevleri haftalık dağılıma yerleştirir
- [x] Me Time Agent (claude-sonnet) — profil + ruh haline göre 5-8 aktivite
- [x] Location Agent — Places API + Ticketmaster paralel enrichment
- [x] CEO Agent (claude-opus) — multi-turn history, intent detection (5 kategori), SSE streaming
- [x] SSE streaming endpoint (`/api/chat/stream`)

### ✅ Faz 4 — Haftalık Plan UI (TAMAMLANDI)
- [x] Dashboard sayfası — haftalık özet, hızlı aksiyonlar
- [x] Haftalık plan sayfası — gerçek API (generate + approve), drag-drop
- [x] Plan onay akışı → Google Calendar'a yazma
- [x] CEO Chat arayüzü — streaming, multi-turn history, status mesajları
- [x] `venue_search` intent — "Kadıköy kafe" gibi doğrudan mekan sorguları

### ✅ Faz 5 — Me Time Sistemi (TAMAMLANDI)
- [x] Me Time profil formu (7 bölümlü wizard)
- [x] Me Time Agent — aktivite önerileri üretimi
- [x] Google Maps/Places API entegrasyonu — mekan enrichment
- [x] Ticketmaster API entegrasyonu — etkinlik önerileri
- [x] Me Time öneri sayfası
- [x] CEO Chat'te Me Time inline — ayrı sayfaya yönlendirmeden yanıt

### 🔄 Faz 6 — Cilalama & Deploy (DEVAM EDİYOR)
- [ ] Me Time suggestions sayfası — takvime ekleme UX (date/time picker)
- [ ] Haftalık plan drag-drop → API PATCH çağrısı (şu an local state)
- [ ] Drive Agent (tam implementasyon)
- [x] Otomatik haftalık plan takvimi (cron — `api/cron.py`)
- [ ] Mobile view düzenlemeleri
- [ ] Vercel (frontend) + Railway (backend) deploy
- [ ] End-to-end testler

### Bilinen Kısıtlamalar
- Drive API scope eksikliği → kullanıcıların OAuth'u yenilemesi gerekiyor ("İzinleri Yenile" butonu ayarlarda)
- Apify/Eventbrite entegrasyonu kaldırıldı (404 hatası) — Google Maps + Ticketmaster yeterli
- Planning Agent test veriyle 1 görev üretiyordu; prompt güncellemesiyle düzeltildi

---

## Temel Tasarım Kararları

- **CEO her zaman Türkçe konuşur.** Alt ajanlar iç iletişimde İngilizce JSON kullanabilir, ama kullanıcıya ulaşan her şey Türkçe.
- **Me Time profili hard-filtre değil ağırlık olarak kullanılır.** Öneri yelpazesi geniş tutulur; sürpriz seçenekler kasıtlı dahil edilir.
- **Sheets Agent format bağımsız çalışır.** Kullanıcının mevcut Yapılacaklar dosyası ne biçimde olursa olsun AI çözer.
- **Plan önce gösterilir, onay sonra yazılır.** Takvime hiçbir şey kullanıcı onaylamadan işlenmez.
- **Agent hataları kullanıcıya şeffaf raporlanır.** CEO "Gmail'e ulaşamadım, sadece Sheets verileriyle plan yapıyorum" der.
