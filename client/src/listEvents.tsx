import { useEffect, useState } from "react";

export type EventItem = {
  id: string | number;
  title: string;
};

export default function ListEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);

  async function loadEvents(): Promise<void> {
    const res = await fetch("/api/events");
    setEvents(await res.json());
  }

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <>
      <h1>Events</h1>
      {events.map((e) => (
        <div key={e.id}>{e.title}</div>
      ))}
    </>
  );
}
