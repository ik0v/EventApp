import React, { useState } from "react";
import ListEvents from "../components/listEvents";
import AddEventForm from "../components/addEventForm";
import NavBar from "../components/navBar";
import "./eventsPage.css";

export default function EventsPage() {
  const [counter, setCounter] = useState<number>(0);

  return (
    <div className="fp">
      <NavBar />

      <main className="fpMain">
        <section id="events" className="fpSection">
          <ListEvents />
        </section>
      </main>
    </div>
  );
}
