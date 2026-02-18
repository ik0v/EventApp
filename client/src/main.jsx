import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { Route, Routes } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <BrowserRouter>
    <Application />
  </BrowserRouter>,
);

function ListEvents() {
  const [events, setEvents] = useState([]);

  async function loadEvents() {
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

function AddEventForm() {
  const [title, setTitle] = useState("");

  async function saveEvent(e) {
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

function FrontPage() {
  const [counter, setCounter] = useState(0);

  return (
    <>
      <h2>Welcome to my application</h2>
      <div>
        <button onClick={() => setCounter((oldValue) => oldValue + 1)}>
          Click me
        </button>
      </div>
      <div>You have clicked {counter} times</div>

      <ListEvents />
      <AddEventForm />
    </>
  );
}

function Application() {
  return (
    <Routes>
      <Route path={"/"} element={<FrontPage />} />
      <Route path={"*"} element={<h1>Page not found</h1>} />
    </Routes>
  );
}
