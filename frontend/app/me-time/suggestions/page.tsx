"use client";
import { useState } from "react";
import Link from "next/link";
import { MapPin, Clock, Wallet, Zap, Navigation, ExternalLink, Calendar, ChevronDown, ChevronUp } from "lucide-react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

interface Venue { name: string; address: string; rating?: number; maps_url?: string; }
interface Event { name?: string; title?: string; date?: string; url?: string; price?: string; }
interface TravelInfo { duration_traffic_min: number; traffic_level: string; traffic_label: string; }
interface Activity {
  id: string; title: string; description: string; category: string;
  why_suitable: string; estimated_duration_hours: number; budget_range: string;
  indoor_outdoor: string; energy_level: string;
  venues: Venue[]; events: Event[]; travel: TravelInfo | null;
}

const ENERGY_COLORS: Record<string, string> = {
  düşük: "bg-green-100 text-green-700",
  orta: "bg-amber-100 text-amber-700",
  yüksek: "bg-red-100 text-red-700",
};

const TRAFFIC_COLORS: Record<string, string> = {
  low: "text-green-600", medium: "text-amber-600", heavy: "text-red-600",
};

export default function MeTimeSuggestionsPage() {
  const [mood, setMood] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

  async function addToCalendar(activityIndex: number, date: string, startTime: string) {
    if (!suggestionId) return;
    const res = await fetch(`${BACKEND}/api/me-time/add-to-calendar`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestion_id: suggestionId, activity_index: activityIndex, venue_index: 0, date, start_time: startTime }),
    });
    if (res.ok) alert("Takvime eklendi!");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-xl text-zinc-900">Me Time</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Kendine zaman ayır</p>
        </div>
        <Link href="/me-time/profile"
          className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">
          Profilim
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Mood input */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-sm">
          <p className="font-semibold text-zinc-900">Bu sefer nasıl hissetmek istiyorsun?</p>
          <textarea value={mood} onChange={(e) => setMood(e.target.value)}
            placeholder="Örn: biraz macera istiyorum ama fazla yorulmak istemiyorum, müzik dinleyerek vakit geçirmek güzel olur..."
            rows={3}
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-shadow" />
          <button onClick={getSuggestions} disabled={loading || !mood.trim()}
            className="w-full py-3 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
            {loading ? "Öneriler hazırlanıyor..." : "Öneri Al"}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
        )}

        {/* Plan Pete yanıtı */}
        {moodResponse && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">PP</div>
            <p className="text-sm text-zinc-700 bg-white border border-zinc-200 rounded-2xl rounded-tl-sm px-4 py-3 leading-relaxed shadow-sm">{moodResponse}</p>
          </div>
        )}

        {/* Aktivite kartları */}
        {activities.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{activities.length} öneri</p>
            {activities.map((act, idx) => (
              <ActivityCard key={act.id} activity={act} index={idx} onAddToCalendar={addToCalendar} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityCard({ activity, index, onAddToCalendar }: {
  activity: Activity; index: number;
  onAddToCalendar: (idx: number, date: string, time: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("15:00");

  const venue = activity.venues[0];
  const event = activity.events[0];
  const travel = activity.travel;

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Ana içerik */}
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-zinc-900">{activity.title}</h3>
            <p className="text-sm text-zinc-500 mt-0.5 leading-relaxed">{activity.description}</p>
          </div>
          <span className="text-xs bg-zinc-100 text-zinc-600 rounded-full px-2.5 py-1 shrink-0 font-medium">
            {activity.budget_range}
          </span>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <Clock size={11} /> ~{activity.estimated_duration_hours} saat
          </span>
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <MapPin size={11} /> {activity.indoor_outdoor}
          </span>
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ENERGY_COLORS[activity.energy_level] ?? "bg-zinc-100 text-zinc-600"}`}>
            <Zap size={10} /> {activity.energy_level}
          </span>
          {travel && (
            <span className={`flex items-center gap-1 text-xs font-medium ${TRAFFIC_COLORS[travel.traffic_level] ?? "text-zinc-500"}`}>
              <Navigation size={11} /> ~{travel.duration_traffic_min} dk · {travel.traffic_label}
            </span>
          )}
        </div>

        {/* Neden uygun */}
        <p className="text-xs text-zinc-400 italic border-l-2 border-zinc-100 pl-3 leading-relaxed">
          {activity.why_suitable}
        </p>
      </div>

      {/* Mekan */}
      {venue && (
        <div className="border-t border-zinc-100 px-5 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-800 truncate">{venue.name}</p>
            <p className="text-xs text-zinc-400 truncate mt-0.5">{venue.address}</p>
            {venue.rating && <p className="text-xs text-amber-500 mt-0.5">★ {venue.rating}</p>}
          </div>
          {venue.maps_url && (
            <a href={venue.maps_url} target="_blank" rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">
              <ExternalLink size={11} /> Harita
            </a>
          )}
        </div>
      )}

      {/* Etkinlik */}
      {event && (
        <div className="border-t border-zinc-100 px-5 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-zinc-400 mb-0.5">Yaklaşan etkinlik</p>
            <p className="text-sm font-medium text-zinc-800 truncate">{event.name ?? event.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {event.date && <span className="text-xs text-zinc-400">{event.date}</span>}
              {event.price && <span className="text-xs text-zinc-500">{event.price}</span>}
            </div>
          </div>
          {event.url && (
            <a href={event.url} target="_blank" rel="noopener noreferrer"
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 transition-colors">
              Bilet
            </a>
          )}
        </div>
      )}

      {/* Diğer mekanlar (genişletilebilir) */}
      {activity.venues.length > 1 && (
        <div className="border-t border-zinc-100">
          <button onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-zinc-400 hover:bg-zinc-50 transition-colors">
            <span>{activity.venues.length - 1} mekan daha</span>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {expanded && (
            <div className="px-5 pb-3 space-y-2">
              {activity.venues.slice(1).map((v, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-zinc-700 font-medium">{v.name}</span>
                    <span className="text-zinc-400 ml-2 truncate">{v.address}</span>
                  </div>
                  {v.maps_url && (
                    <a href={v.maps_url} target="_blank" rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-zinc-700 ml-2 shrink-0 transition-colors">
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
      <div className="border-t border-zinc-100 px-5 py-4">
        {!showPicker ? (
          <button onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors">
            <Calendar size={14} /> Takvime Ekle
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <p className="text-xs text-zinc-500 mb-1.5">Tarih</p>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-zinc-500 mb-1.5">Saat</p>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPicker(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                İptal
              </button>
              <button onClick={() => { onAddToCalendar(index, date, time); setShowPicker(false); }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-sm hover:bg-zinc-700 transition-colors">
                Ekle
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
