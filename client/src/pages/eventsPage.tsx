import React, { useState } from "react";
import ListEvents from "../listEvents";
import AddEventForm from "../components/addEventForm";
import NavBar from "../components/navBar";
import "./eventsPage.css";

export default function EventsPage() {
  const [counter, setCounter] = useState<number>(0);

  return (
    <div className="fp">
      <NavBar />

      <main className="fpMain">
        <h2>Welcome</h2>
        <section id="events" className="fpSection">
          <ListEvents />
        </section>

        <section id="add" className="fpSection">
          <AddEventForm />
        </section>
      </main>
    </div>
  );
}
