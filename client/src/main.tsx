import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import EventsPage from "./pages/eventsPage";
import LoginPage from "./pages/loginPage";
import LoginCallback from "./pages/loginCallback";
import AddEventPage from "./pages/addEventPage";

const root = ReactDOM.createRoot(document.getElementById("root")!);

root.render(
  <BrowserRouter>
    <Application />
  </BrowserRouter>,
);

function Application() {
  return (
    <Routes>
      <Route path={"/"} element={<LoginPage />} />
      <Route path={"/events"} element={<EventsPage />} />
      <Route path={"/add"} element={<AddEventPage />} />
      <Route path={"*"} element={<h1>Page not found</h1>} />
      <Route path={"/login"} element={<LoginPage />} />
      <Route path={"/login/callback"} element={<LoginCallback />} />
    </Routes>
  );
}
