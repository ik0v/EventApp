import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./authContext";
import Spinner from "./spinner";
import "./listEvents.css";

export type Attendee = {
  userSub: string;
  joinedAt?: string;
};

export type EventItem = {
  _id: string | number;
  title: string;
  description?: string;
  place?: string;
  time?: string;
  category?: string;
  imageUrl?: string;
  attendees?: Attendee[];
};

const CATEGORIES = ["Fun", "Education", "Animals"] as const;

function formatWhen(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

type Filters = {
  title: string;
  place: string;
  category: string; // "" means All
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
};

export default function ListEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { sub } = useAuth();

  // UI filters
  const [filters, setFilters] = useState<Filters>({
    title: "",
    place: "",
    category: "",
    from: "",
    to: "",
  });

  // Applied filters (used by fetch)
  const [applied, setApplied] = useState<Filters>(filters);

  const queryString = useMemo(() => {
    const qs = new URLSearchParams();

    if (applied.title.trim()) qs.set("title", applied.title.trim());
    if (applied.place.trim()) qs.set("place", applied.place.trim());
    if (applied.category) qs.set("category", applied.category);
    if (applied.from) qs.set("from", applied.from); // date-only
    if (applied.to) qs.set("to", applied.to); // date-only

    const s = qs.toString();
    return s ? `?${s}` : "";
  }, [applied]);

  async function loadEvents(): Promise<void> {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/events${queryString}`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      const data: EventItem[] = await res.json();
      setEvents(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAttend(eventId: string | number, isJoined: boolean) {
    setError("");
    if (!sub) {
      setError("You must be logged in to join events.");
      return;
    }

    const options: RequestInit = {
      method: isJoined ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
    };
    if (!isJoined) options.body = JSON.stringify({ status: "going" });

    const res = await fetch(`/api/events/${eventId}/attend`, options);
    if (!res.ok) {
      setError(`${res.status} ${res.statusText}`);
      return;
    }

    await loadEvents();
  }

  function applyFilters() {
    setApplied(filters);
  }

  function clearFilters() {
    const empty: Filters = {
      title: "",
      place: "",
      category: "",
      from: "",
      to: "",
    };
    setFilters(empty);
    setApplied(empty);
  }

  useEffect(() => {
    loadEvents();
  }, [queryString]);

  return (
    <section className="events">
      <div className="events-header">
        <h2 className="events-title">Events</h2>
        <button className="events-reload" type="button" onClick={loadEvents}>
          Reload
        </button>
      </div>

      {/* Filters */}
      <div className="events-filters">
        <div className="events-filter-grid">
          <label className="events-filter">
            <span className="events-filter-label">Title</span>
            <input
              className="events-filter-input"
              value={filters.title}
              onChange={(e) =>
                setFilters((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Search title…"
            />
          </label>

          <label className="events-filter">
            <span className="events-filter-label">Place</span>
            <input
              className="events-filter-input"
              value={filters.place}
              onChange={(e) =>
                setFilters((f) => ({ ...f, place: e.target.value }))
              }
              placeholder="Oslo, Bergen…"
            />
          </label>

          <label className="events-filter">
            <span className="events-filter-label">Category</span>
            <select
              className="events-filter-input"
              value={filters.category}
              onChange={(e) =>
                setFilters((f) => ({ ...f, category: e.target.value }))
              }
            >
              <option value="">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="events-filter">
            <span className="events-filter-label">From</span>
            <input
              className="events-filter-input"
              type="date"
              value={filters.from}
              onChange={(e) =>
                setFilters((f) => ({ ...f, from: e.target.value }))
              }
            />
          </label>

          <label className="events-filter">
            <span className="events-filter-label">To</span>
            <input
              className="events-filter-input"
              type="date"
              value={filters.to}
              onChange={(e) =>
                setFilters((f) => ({ ...f, to: e.target.value }))
              }
            />
          </label>
        </div>

        <div className="events-filter-actions">
          <button
            type="button"
            className="events-filter-btn primary"
            onClick={applyFilters}
          >
            Apply
          </button>
          <button
            type="button"
            className="events-filter-btn"
            onClick={clearFilters}
          >
            Clear
          </button>
        </div>
      </div>

      {error ? <div className="events-error">{error}</div> : null}

      {loading ? (
        <div className="events-loading" aria-busy="true">
          <Spinner size={28} />
        </div>
      ) : events.length === 0 ? (
        <div className="events-muted">No events yet.</div>
      ) : (
        <div className="events-grid">
          {events.map((e) => {
            const isJoined =
              !!sub && (e.attendees ?? []).some((a) => a.userSub === sub);

            return (
              <article key={e._id} className="event-card">
                <Link to={`/events/${e._id}`} className="event-link">
                  <div className="event-media">
                    {e.imageUrl ? (
                      <img
                        className="event-image"
                        src={e.imageUrl}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        className="event-image-placeholder"
                        aria-hidden="true"
                      >
                        No image
                      </div>
                    )}
                  </div>
                </Link>

                <div className="event-body">
                  <div className="event-top">
                    <h3 className="event-title">{e.title}</h3>
                    {e.category ? (
                      <span className="event-badge">{e.category}</span>
                    ) : null}
                  </div>

                  {e.description ? (
                    <p className="event-description">{e.description}</p>
                  ) : null}

                  <div className="event-meta">
                    {e.place ? (
                      <div className="event-row">
                        <span className="event-label">Place</span>
                        <span className="event-value">{e.place}</span>
                      </div>
                    ) : null}

                    {e.time ? (
                      <div className="event-row">
                        <span className="event-label">Time</span>
                        <span className="event-value">
                          {formatWhen(e.time)}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <button
                    className={`event-join-btn ${isJoined ? "joined" : ""}`}
                    onClick={() => toggleAttend(e._id, isJoined)}
                    disabled={!sub}
                    type="button"
                  >
                    {sub ? (isJoined ? "Leave" : "Join") : "Login to join"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
