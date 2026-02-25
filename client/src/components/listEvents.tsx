import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./authContext";
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
  const [mySub, setMySub] = useState<string | null>(null);
  const { loggedIn, isAdmin, sub, loadingUser } = useAuth();

  // async function loadProfile(): Promise<void> {
  //   try {
  //     const res = await fetch("/api/profile");
  //     if (!res.ok) {
  //       setMySub(null);
  //       return;
  //     }
  //     const data = await res.json();
  //     setMySub(data?.sub ?? null);
  //   } catch {
  //     setMySub(null);
  //   }
  // }

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
    if (!isJoined) {
      options.body = JSON.stringify({ status: "going" });
    }
    const res = await fetch(`/api/events/${eventId}/attend`, options);

    if (!res.ok) {
      setError(`${res.status} ${res.statusText}`);
      return;
    }
    await loadEvents();
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
          {events.map((e) => {
            const isJoined =
              !!sub && (e.attendees ?? []).some((a) => a.userSub === sub);

            return (
              <article key={e._id} className="event-card">
                <Link to={`/events/${e._id}`} className="event-link">
                  <div className="event-media">
                    {e.imageUrl ? (
                      <img className="event-image" src={e.imageUrl} alt="" />
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
