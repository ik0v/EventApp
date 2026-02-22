import React, { useState, FormEvent } from "react";

export default function AddEventForm() {
  const [title, setTitle] = useState("");

  async function saveEvent(e: FormEvent) {
    e.preventDefault();
    await fetch("/api/events", {
      method: "POST",
      body: JSON.stringify({ title }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  return (
    <form onSubmit={saveEvent}>
      <h1>Add Event</h1>
      <div>
        Title:
        <br />
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <button>Submit</button>
      </div>
    </form>
  );
}
