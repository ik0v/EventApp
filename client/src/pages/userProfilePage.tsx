import React from "react";
import NavBar from "../components/navBar";
import UserProfile from "../components/userProfile";
import "./eventsPage.css";

export default function UserProfilePage() {
  return (
    <div className="fp">
      <NavBar />

      <main className="fpMain">
        <section id="profile" className="fpSection">
          <UserProfile />
        </section>
      </main>
    </div>
  );
}
