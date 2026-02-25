import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import NavBar from "../components/navBar";
import "./eventPage.css";
import "./eventsPage.css";

type Attendee = {
  userSub: string;
  name?: string;
  picture?: string;
  email?: string;
  joinedAt?: string;
};

type EventItem = {
  _id: string;
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

export default function EventPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mySub, setMySub] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  async function loadProfile() {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) {
        setMySub(null);
        setIsAdmin(false);
        return;
      }
      const data = await res.json();
      setMySub(data?.sub ?? null);
      setIsAdmin(data?.isAdmin ?? false);
    } catch {
      setMySub(null);
    }
  }

  async function loadEvent() {
    if (!id) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/events/${id}`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      const data: EventItem = await res.json();
      setEvent(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load event");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAttend(isJoined: boolean) {
    if (!id) return;

    const options: RequestInit = {
      method: isJoined ? "DELETE" : "POST",
    };

    const res = await fetch(`/api/events/${id}/attend`, options);

    if (!res.ok) {
      setError(`${res.status} ${res.statusText}`);
      return;
    }

    await loadEvent();
  }

  useEffect(() => {
    loadProfile();
    loadEvent();
  }, [id]);

  if (loading) return <div>Loading…</div>;
  if (error) return <div>{error}</div>;
  if (!event) return <div>Event not found</div>;

  const isJoined =
    !!mySub && (event.attendees ?? []).some((a) => a.userSub === mySub);

  return (
    <div className="fp">
      <NavBar />

      <main className="fpMain">
        <section className="fpSection">
          <div className="event-page">
            <div className="event-page-card">
              <div className="event-page-media">
                {event.imageUrl ? (
                  <img
                    src={event.imageUrl}
                    alt=""
                    className="event-page-image"
                  />
                ) : (
                  <div
                    className="event-page-image-placeholder"
                    aria-hidden="true"
                  >
                    No image
                  </div>
                )}
              </div>

              <div className="event-page-body">
                <h1 className="event-page-title">{event.title}</h1>

                {event.category && (
                  <span className="event-page-badge">{event.category}</span>
                )}

                {event.description && (
                  <p className="event-page-description">{event.description}</p>
                )}

                <div className="event-page-meta">
                  {event.place && (
                    <div className="event-page-row">
                      <span className="event-page-label">Place</span>
                      <span className="event-page-value">{event.place}</span>
                    </div>
                  )}

                  {event.time && (
                    <div className="event-page-row">
                      <span className="event-page-label">Time</span>
                      <span className="event-page-value">
                        {formatWhen(event.time)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="event-page-attendees">
                  {event.attendees?.length ?? 0} attending
                </div>

                <div className="event-page-actions">
                  <button
                    className={`event-join-btn ${isJoined ? "joined" : ""}`}
                    onClick={() => toggleAttend(isJoined)}
                    disabled={!mySub}
                    type="button"
                  >
                    {mySub ? (isJoined ? "Leave" : "Join") : "Login to join"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {isAdmin && (
          <div className="event-page-attendees-list">
            <div className="event-page-attendees-title">Attendees</div>

            {(event.attendees ?? []).length === 0 ? (
              <div className="event-page-attendees-empty">
                No attendees yet.
              </div>
            ) : (
              <ul className="event-page-attendees-ul">
                {(event.attendees ?? []).map((a) => (
                  <li key={a.userSub} className="event-page-attendees-li">
                    <div className="event-page-attendee-left">
                      {a.picture ? (
                        <img
                          src={a.picture}
                          alt=""
                          className="event-page-attendee-avatar"
                        />
                      ) : (
                        <div
                          className="event-page-attendee-avatar placeholder"
                          aria-hidden="true"
                        />
                      )}

                      <div className="event-page-attendee-text">
                        <div className="event-page-attendee-name">
                          {a.name || a.email || a.userSub}
                        </div>

                        {a.email ? (
                          <div className="event-page-attendee-email">
                            {a.email}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {a.joinedAt ? (
                      <div className="event-page-attendee-when">
                        {formatWhen(a.joinedAt)}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
