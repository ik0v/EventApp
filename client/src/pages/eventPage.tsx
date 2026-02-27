import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import NavBar from "../components/navBar";
import { useAuth } from "../components/authContext";
import Spinner from "../components/spinner";
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
  createdBy?: string;
};

function formatWhen(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

// For <input type="datetime-local" />
function toLocalInputValue(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function formatDateOnly(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

export default function EventPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { isAdmin, sub } = useAuth();

  const [editing, setEditing] = useState(false);
  const [eventData, setEventData] = useState<{
    title: string;
    description: string;
    place: string;
    time: string;
    category: string;
    imageUrl: string;
  }>({
    title: "",
    description: "",
    place: "",
    time: "",
    category: "",
    imageUrl: "",
  });
  const [creator, setCreator] = useState<{
    name?: string;
    picture?: string;
    email?: string;
  } | null>(null);

  async function loadEvent() {
    if (!id) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/events/${id}`);
      if (!res.ok) {
        let msg = `${res.status} ${res.statusText}`;
        try {
          const data = await res.json();
          if (data?.message) msg = data.message; // e.g. "Wrong event id format"
        } catch {}
        throw new Error(msg);
      }

      const data: EventItem = await res.json();
      setEvent(data);

      if (data.createdBy) {
        try {
          const userRes = await fetch(
            `/api/user-profile?sub=${data.createdBy}`,
          );
          if (userRes.ok) {
            const user = await userRes.json();
            setCreator(user);
          } else {
            setCreator(null);
          }
        } catch {
          setCreator(null);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load event");
    } finally {
      setLoading(false);
    }
  }

  function startEdit() {
    if (!event) return;
    setEventData({
      title: event.title ?? "",
      description: event.description ?? "",
      place: event.place ?? "",
      time: toLocalInputValue(event.time),
      category: event.category ?? "",
      imageUrl: event.imageUrl ?? "",
    });
    setEditing(true);
    setError("");
  }

  function cancelEdit() {
    setEditing(false);
    setError("");
  }

  async function saveEdit() {
    if (!event) return;

    const payload: any = { ...eventData };
    if (!payload.time) delete payload.time;
    else payload.time = new Date(payload.time).toISOString();

    setError("");
    const res = await fetch(`/api/events/${event._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setError(`${res.status} ${res.statusText}`);
      return;
    }

    setEditing(false);
    await loadEvent();
  }

  async function deleteEvent() {
    if (!event) return;
    setError("");

    const ok = window.confirm("Delete this event? This cannot be undone.");
    if (!ok) return;

    const res = await fetch(`/api/events/${event._id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(`${res.status} ${res.statusText}`);
      return;
    }

    navigate("/events");
  }

  async function toggleAttend(isJoined: boolean) {
    if (!id) return;

    const options: RequestInit = { method: isJoined ? "DELETE" : "POST" };
    const res = await fetch(`/api/events/${id}/attend`, options);

    if (!res.ok) {
      setError(`${res.status} ${res.statusText}`);
      return;
    }

    await loadEvent();
  }

  useEffect(() => {
    loadEvent();
  }, [id]);

  if (loading)
    return (
      <div className="page-loading" aria-busy="true">
        <Spinner size={32} />
      </div>
    );
  if (error) return <div>{error}</div>;
  if (!event) return <div>Event not found</div>;

  const canEdit = !!isAdmin && !!sub && event.createdBy === sub;
  const isJoined =
    !!sub && (event.attendees ?? []).some((a) => a.userSub === sub);

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
                <h1 className="event-page-title">
                  {editing ? (
                    <input
                      className="event-edit-input title"
                      value={eventData.title}
                      onChange={(e) =>
                        setEventData((d) => ({ ...d, title: e.target.value }))
                      }
                    />
                  ) : (
                    event.title
                  )}
                </h1>

                {(event.category || editing) &&
                  (editing ? (
                    <input
                      className="event-edit-input badge"
                      value={eventData.category}
                      onChange={(e) =>
                        setEventData((d) => ({
                          ...d,
                          category: e.target.value,
                        }))
                      }
                      placeholder="Category"
                    />
                  ) : (
                    <span className="event-page-badge">{event.category}</span>
                  ))}

                {(event.description || editing) &&
                  (editing ? (
                    <textarea
                      className="event-edit-textarea"
                      value={eventData.description}
                      onChange={(e) =>
                        setEventData((d) => ({
                          ...d,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Description"
                    />
                  ) : (
                    <p className="event-page-description">
                      {event.description}
                    </p>
                  ))}

                <div className="event-page-meta">
                  {(event.place || editing) && (
                    <span className="event-page-value">
                      {editing ? (
                        <input
                          className="event-edit-input"
                          value={eventData.place}
                          onChange={(e) =>
                            setEventData((d) => ({
                              ...d,
                              place: e.target.value,
                            }))
                          }
                          placeholder="Place"
                        />
                      ) : (
                        event.place
                      )}
                    </span>
                  )}

                  {(event.time || editing) && (
                    <span className="event-page-value">
                      {editing ? (
                        <span className="event-time-edit">
                          <input
                            type="datetime-local"
                            className="event-edit-input"
                            value={eventData.time}
                            onChange={(e) =>
                              setEventData((d) => ({
                                ...d,
                                time: e.target.value,
                              }))
                            }
                          />
                          {event.time ? (
                            <span className="event-time-current">
                              {formatWhen(event.time)}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        formatWhen(event.time)
                      )}
                    </span>
                  )}
                </div>

                {!editing && (
                  <div className="event-page-attendees">
                    {event.attendees?.length ?? 0} attending
                  </div>
                )}
                <div className="event-page-actions">
                  {canEdit && !editing && (
                    <>
                      <button
                        className="event-btn"
                        type="button"
                        onClick={startEdit}
                      >
                        Edit
                      </button>
                      <button
                        className="event-btn danger"
                        type="button"
                        onClick={deleteEvent}
                      >
                        Delete
                      </button>
                    </>
                  )}

                  {canEdit && editing && (
                    <div className="event-page-actions-row">
                      <button
                        className="event-btn primary"
                        type="button"
                        onClick={saveEdit}
                      >
                        Update
                      </button>
                      <button
                        className="event-btn"
                        type="button"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {!editing && (
                    <button
                      className={`event-join-btn ${isJoined ? "joined" : ""}`}
                      onClick={() => toggleAttend(isJoined)}
                      disabled={!sub || editing}
                      type="button"
                    >
                      {sub ? (isJoined ? "Leave" : "Join") : "Login to join"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {event && (
          <div className="event-creator-wrap">
            <div className="event-creator-card">
              <div className="event-creator-title">Created by</div>

              <div className="event-creator-content">
                {creator?.picture ? (
                  <img
                    src={creator.picture}
                    alt=""
                    className="event-creator-avatar"
                  />
                ) : (
                  <div className="event-creator-avatar placeholder" />
                )}

                <div className="event-creator-text">
                  <div className="event-creator-name">
                    {creator?.name || creator?.email || event.createdBy}
                  </div>

                  <div className="event-creator-date">
                    {formatDateOnly(event.time)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
                          {a.name || a.userSub || a.email}
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
