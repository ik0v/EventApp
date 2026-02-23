import NavBar from "../components/navBar";
import AddEventForm from "../components/addEventForm";
import "./eventsPage.css";

export default function AddEventPage() {
  return (
    <div className="fp">
      <NavBar />

      <main className="fpMain">
        <section className="fpSection">
          <AddEventForm />
        </section>
      </main>
    </div>
  );
}
