import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import FrontPage from "./pages/frontPage";
import LoginButton from "./components/LoginButton";
import LoginCallback from "./pages/LoginCallback";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <BrowserRouter>
    <Application />
  </BrowserRouter>,
);

function Application() {
  return (
    <Routes>
      <Route path={"/"} element={<FrontPage />} />
      <Route path={"*"} element={<h1>Page not found</h1>} />
      <Route path={"/login"} element={<LoginButton />} />
      <Route path={"/login/callback"} element={<LoginCallback />} />
    </Routes>
  );
}
