"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, MapPin, Navigation, ExternalLink, Calendar, ChevronDown, ChevronUp, Zap, User } from "lucide-react";
import { PeteAvatar } from "@/components/chat/MessageBubble";
import { staggerContainer, fadeUp, cardHover } from "@/lib/animations";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

interface Venue    { name: string; address: string; rating?: number; maps_url?: string; }
interface Event    { name?: string; title?: string; date?: string; url?: string; price?: string; }
interface Travel   { duration_traffic_min: number; traffic_level: string; traffic_label: string; }
interface Activity {
  id: string; title: string; description: string; category: string;
  why_suitable: string; estimated_duration_hours: number; budget_range: string;
  indoor_outdoor: string; energy_level: string;
  venues: Venue[]; events: Event[]; travel: Travel | null;
}

// ── Kategori renk sistemi ─────────────────────────────────────────────────
const CATEGORIES: Record<string, { gradient: string; emoji: string }> = {
  müzik:      { gradient: "linear-gradient(135deg,#7C3AED,#A78BFA)", emoji: "🎵" },
  konser:     { gradient: "linear-gradient(135deg,#7C3AED,#A78BFA)", emoji: "🎶" },
  spor:       { gradient: "linear-gradient(135deg,#FF6B35,#EF4444)", emoji: "⚡" },
  hareket:    { gradient: "linear-gradient(135deg,#FF6B35,#EF4444)", emoji: "💪" },
  doğa:       { gradient: "linear-gradient(135deg,#059669,#34D399)", emoji: "🌿" },
  "açık hava":{ gradient: "linear-gradient(135deg,#059669,#34D399)", emoji: "🌳" },
  yemek:      { gradient: "linear-gradient(135deg,#FFB347,#FF6B35)", emoji: "🍽️" },
  kafe:       { gradient: "linear-gradient(135deg,#E89B2E,#FFB347)", emoji: "☕" },
  sanat:      { gradient: "linear-gradient(135deg,#EC4899,#F472B6)", emoji: "🎨" },
  sergi:      { gradient: "linear-gradient(135deg,#EC4899,#F472B6)", emoji: "🖼️" },
  film:       { gradient: "linear-gradient(135deg,#6366F1,#8B5CF6)", emoji: "🎬" },
  tiyatro:    { gradient: "linear-gradient(135deg,#6366F1,#8B5CF6)", emoji: "🎭" },
  öğrenme:    { gradient: "linear-gradient(135deg,#0EA5E9,#38BDF8)", emoji: "📚" },
  teknoloji:  { gradient: "linear-gradient(135deg,#0EA5E9,#38BDF8)", emoji: "💻" },
  sosyal:     { gradient: "linear-gradient(135deg,#F59E0B,#FBBF24)", emoji: "🤝" },
};
const DEFAULT_CAT = { gradient: "linear-gradient(135deg,#FF6B35,#FFB347)", emoji: "✨" };

function getCat(category: string) {
  const lower = category.toLowerCase();
  for (const [key, cfg] of Object.entries(CATEGORIES)) {
    if (lower.includes(key)) return cfg;
  }
  return DEFAULT_CAT;
}

const ENERGY: Record<string, string> = {
  düşük: "bg-green-100 text-green-700",
  orta:  "bg-[#FFF1EC] text-[#FF6B35]",
  yüksek:"bg-red-100 text-red-600",
};
const TRAFFIC: Record<string, string> = {
  low: "text-green-600", medium: "text-[#E89B2E]", heavy: "text-red-600",
};

// ── Animated loading dots ─────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      {[0,1,2].map((i) => (
        <motion.span key={i} className="w-2 h-2 rounded-full bg-[#FF6B35]/60"
          animate={{ scale:[1,1.5,1], opacity:[0.4,1,0.4] }}
          transition={{ duration:0.9, repeat:Infinity, delay:i*0.18, ease:"easeInOut" }} />
      ))}
    </div>
  );
}

// ── Ana sayfa ─────────────────────────────────────────────────────────────
export default function MeTimeSuggestionsPage() {
  const [mood, setMood]             = useState("");
  const [focused, setFocused]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [moodResponse, setMoodResponse] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [suggestionId, setSuggestionId] = useState<string | null>(null);

  async function getSuggestions() {
    if (!mood.trim()) return;
    setLoading(true); setError(""); setActivities([]); setMoodResponse("");
    try {
      const res = await fetch(`${BACKEND}/api/me-time/suggest`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood_input: mood }),
      });
      if (!res.ok) throw new Error("Öneri alınamadı.");
      const data = await res.json();
      setActivities(data.activities ?? []);
      setMoodResponse(data.mood_response ?? "");
      setSuggestionId(data.suggestion_id ?? null);
    } catch { setError("Bir hata oluştu. Lütfen tekrar dene."); }
    finally { setLoading(false); }
  }

  async function addToCalendar(activityIndex: number, date: string, startTime: string): Promise<boolean> {
    if (!suggestionId) return false;
    try {
      const res = await fetch(`${BACKEND}/api/me-time/add-to-calendar`, {
        method:"POST", credentials:"include",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ suggestion_id:suggestionId, activity_index:activityIndex, venue_index:0, date, start_time:startTime }),
      });
      return res.ok;
    } catch { return false; }
  }

  return (
    <div className="min-h-screen bg-[#FFF8F2]">
      {/* ── Header ── */}
      <header className="gradient-hero px-6 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-white font-800 text-xl leading-tight">Me Time</h1>
          <p className="text-white/70 text-sm mt-0.5">Kendine zaman ayır ✨</p>
        </div>
        <Link href="/me-time/profile"
          className="flex items-center gap-1.5 text-xs font-600 bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full hover:bg-white/30 transition-colors">
          <User size={11} /> Profilim
        </Link>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* ── Mood input ── */}
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
          <p className="font-700 text-[#1A0F0A] text-base">Bu sefer nasıl hissetmek istiyorsun?</p>
          <div className={`rounded-xl border transition-all duration-200 ${
            focused
              ? "border-[#FF6B35]/50 shadow-[0_0_0_3px_rgba(255,107,53,0.1)]"
              : "border-[#F0E4D7]"
          }`}>
            <textarea
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) getSuggestions(); }}
              placeholder="Örn: biraz macera istiyorum ama fazla yorulmak istemiyorum, müzik dinleyerek vakit geçirmek güzel olur..."
              rows={3}
              className="w-full px-4 py-3 text-sm resize-none bg-transparent outline-none text-[#1A0F0A] placeholder-[#C4A899] rounded-xl font-[inherit]"
            />
          </div>
          <motion.button
            onClick={getSuggestions}
            disabled={loading || !mood.trim()}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl gradient-primary text-white text-sm font-600 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            {loading ? (
              <><ThinkingDots /><span className="text-white/80">Öneriler hazırlanıyor</span></>
            ) : (
              "Öneri Al ✨"
            )}
          </motion.button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {/* ── Pete yanıtı ── */}
        <AnimatePresence>
          {moodResponse && (
            <motion.div
              key="pete-response"
              variants={fadeUp} initial="hidden" animate="show"
              className="flex gap-3 items-start"
            >
              <PeteAvatar />
              <p className="text-sm text-[#1A0F0A] bg-white border-l-2 border-[#FF6B35]/30 rounded-2xl rounded-tl-sm px-4 py-3 leading-relaxed shadow-card flex-1">
                {moodResponse}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Aktivite kartları ── */}
        <AnimatePresence>
          {activities.length > 0 && (
            <motion.div
              key="activities"
              variants={staggerContainer} initial="hidden" animate="show"
              className="space-y-4"
            >
              <motion.p variants={fadeUp} className="text-xs font-600 text-[#A88070] uppercase tracking-wider px-1">
                {activities.length} öneri hazır
              </motion.p>
              {activities.map((act, idx) => (
                <motion.div key={act.id} variants={fadeUp}>
                  <ActivityCard activity={act} index={idx} onAddToCalendar={addToCalendar} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Activity Card ─────────────────────────────────────────────────────────
function ActivityCard({ activity, index, onAddToCalendar }: {
  activity: Activity; index: number;
  onAddToCalendar: (idx: number, date: string, time: string) => Promise<boolean>;
}) {
  const [expanded,  setExpanded]  = useState(false);
  const [showPicker,setShowPicker]= useState(false);
  const [adding,    setAdding]    = useState(false);
  const [addResult, setAddResult] = useState<"success"|"error"|null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("15:00");

  const { gradient, emoji } = getCat(activity.category);
  const venue  = activity.venues[0];
  const event  = activity.events[0];
  const travel = activity.travel;

  return (
    <motion.div
      initial="rest" whileHover="hover"
      variants={cardHover}
      className="bg-white rounded-2xl overflow-hidden"
    >
      {/* Kategori banner */}
      <div className="h-14 flex items-center px-5 gap-3" style={{ background: gradient }}>
        <span className="text-2xl select-none">{emoji}</span>
        <span className="text-white font-700 text-sm capitalize">{activity.category}</span>
        <span className="ml-auto text-[11px] bg-white/25 text-white px-2.5 py-0.5 rounded-full font-600">
          {activity.budget_range}
        </span>
      </div>

      {/* İçerik */}
      <div className="p-5 space-y-3">
        <div>
          <h3 className="font-700 text-[#1A0F0A] text-base leading-snug">{activity.title}</h3>
          <p className="text-sm text-[#6B4F3A] mt-1 leading-relaxed">{activity.description}</p>
        </div>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1 text-xs text-[#A88070] bg-[#F8EFE8] px-2.5 py-1 rounded-full">
            <Clock size={10} /> ~{activity.estimated_duration_hours} saat
          </span>
          <span className="flex items-center gap-1 text-xs text-[#A88070] bg-[#F8EFE8] px-2.5 py-1 rounded-full">
            <MapPin size={10} /> {activity.indoor_outdoor}
          </span>
          <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-500 ${ENERGY[activity.energy_level] ?? "bg-[#F8EFE8] text-[#A88070]"}`}>
            <Zap size={10} /> {activity.energy_level}
          </span>
          {travel && (
            <span className={`flex items-center gap-1 text-xs font-500 px-2.5 py-1 rounded-full bg-[#F8EFE8] ${TRAFFIC[travel.traffic_level] ?? "text-[#A88070]"}`}>
              <Navigation size={10} /> ~{travel.duration_traffic_min} dk · {travel.traffic_label}
            </span>
          )}
        </div>

        {/* Neden uygun */}
        <p className="text-xs text-[#A88070] italic border-l-2 border-[#FFE0D0] pl-3 leading-relaxed">
          {activity.why_suitable}
        </p>
      </div>

      {/* Mekan */}
      {venue && (
        <div className="border-t border-[#F8EFE8] px-5 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-600 text-[#1A0F0A] truncate">{venue.name}</p>
            <p className="text-xs text-[#A88070] truncate mt-0.5">{venue.address}</p>
            {venue.rating && <p className="text-xs text-[#E89B2E] mt-0.5">★ {venue.rating}</p>}
          </div>
          {venue.maps_url && (
            <a href={venue.maps_url} target="_blank" rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-[#F0E4D7] text-[#6B4F3A] hover:bg-[#FFF1EC] transition-colors">
              <ExternalLink size={11} /> Harita
            </a>
          )}
        </div>
      )}

      {/* Etkinlik */}
      {event && (
        <div className="border-t border-[#F8EFE8] px-5 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] text-[#A88070] font-500 uppercase tracking-wide mb-0.5">Yaklaşan etkinlik</p>
            <p className="text-sm font-600 text-[#1A0F0A] truncate">{event.name ?? event.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {event.date  && <span className="text-xs text-[#A88070]">{event.date}</span>}
              {event.price && <span className="text-xs text-[#FF6B35] font-500">{event.price}</span>}
            </div>
          </div>
          {event.url && (
            <a href={event.url} target="_blank" rel="noopener noreferrer"
              className="shrink-0 text-xs px-3 py-1.5 rounded-xl gradient-primary text-white font-600 hover:opacity-90 transition-opacity">
              Bilet
            </a>
          )}
        </div>
      )}

      {/* Diğer mekanlar */}
      {activity.venues.length > 1 && (
        <div className="border-t border-[#F8EFE8]">
          <button onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-[#A88070] hover:bg-[#FFF8F2] transition-colors">
            <span>{activity.venues.length - 1} mekan daha</span>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {expanded && (
            <div className="px-5 pb-3 space-y-2">
              {activity.venues.slice(1).map((v, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#1A0F0A] font-600">{v.name}</span>
                    <span className="text-[#A88070] ml-2">{v.address}</span>
                  </div>
                  {v.maps_url && (
                    <a href={v.maps_url} target="_blank" rel="noopener noreferrer"
                      className="text-[#A88070] hover:text-[#FF6B35] ml-2 shrink-0 transition-colors">
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Takvime ekle */}
      <div className="border-t border-[#F8EFE8] px-5 py-4">
        {!showPicker ? (
          addResult === "success" ? (
            <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-600">
              <Calendar size={14} /> Takvime eklendi ✓
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => { setShowPicker(true); setAddResult(null); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl gradient-primary text-white text-sm font-600 hover:opacity-90 transition-opacity"
            >
              <Calendar size={14} /> Takvime Ekle
            </motion.button>
          )
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <p className="text-xs text-[#A88070] font-500 mb-1.5">Tarih</p>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl border border-[#F0E4D7] px-3 py-2.5 text-sm outline-none focus:border-[#FF6B35]/50 focus:shadow-[0_0_0_2px_rgba(255,107,53,0.1)] transition-all" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#A88070] font-500 mb-1.5">Saat</p>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border border-[#F0E4D7] px-3 py-2.5 text-sm outline-none focus:border-[#FF6B35]/50 focus:shadow-[0_0_0_2px_rgba(255,107,53,0.1)] transition-all" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowPicker(false); setAddResult(null); }}
                className="flex-1 py-2.5 rounded-xl border border-[#F0E4D7] text-sm text-[#6B4F3A] hover:bg-[#FFF8F2] transition-colors">
                İptal
              </button>
              <button disabled={adding}
                onClick={async () => {
                  setAdding(true);
                  const ok = await onAddToCalendar(index, date, time);
                  setAdding(false);
                  setAddResult(ok ? "success" : "error");
                  if (ok) setShowPicker(false);
                }}
                className="flex-1 py-2.5 rounded-xl gradient-primary text-white text-sm font-600 disabled:opacity-50">
                {adding ? "Ekleniyor..." : "Ekle"}
              </button>
            </div>
            {addResult === "error" && (
              <p className="text-xs text-red-600 text-center">Takvime eklenemedi. Tekrar dene.</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
