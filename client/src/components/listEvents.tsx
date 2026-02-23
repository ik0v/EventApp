import { useEffect, useState } from "react";
import "./listEvents.css";

export type EventItem = {
  id: string | number;
  title: string;
  description?: string;
  place?: string;
  time?: string;
  category?: string;
  imageUrl?: string;
};

function formatWhen(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function ListEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadEvents(): Promise<void> {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/events");
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      const data: EventItem[] = await res.json();
      setEvents(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <section className="events">
      <div className="events-header">
        <h2 className="events-title">Events</h2>
        <button className="events-reload" type="button" onClick={loadEvents}>
          Reload
        </button>
      </div>

      {error ? <div className="events-error">{error}</div> : null}

      {loading ? (
        <div className="events-muted">Loading…</div>
      ) : events.length === 0 ? (
        <div className="events-muted">No events yet.</div>
      ) : (
        <div className="events-grid">
          {events.map((e) => (
            <article key={e.id} className="event-card">
              <div className="event-media">
                {e.imageUrl ? (
                  <img className="event-image" src={e.imageUrl} alt="" />
                ) : (
                  <div className="event-image-placeholder" aria-hidden="true">
                    No image
                  </div>
                )}
              </div>

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
                      <span className="event-value">{formatWhen(e.time)}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
