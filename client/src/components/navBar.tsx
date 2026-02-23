import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./navBar.css";
import NavUserChip from "./navUserChip";

export default function NavBar() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/profile");
      setLoggedIn(res.ok);
    })();
  }, []);

  return (
    <header className="nav">
      <div className="navLeft">
        <div className="navBrand">EventApp</div>
        <Link className="navLink" to="/about">
          About
        </Link>
      </div>

      <div className="navCenter">
        <Link className="navLink navLinkCenter" to="/frontPage">
          Events
        </Link>
      </div>

      <div className="navRight">
        {loggedIn ? (
          <Link className="navLink" to="/addEvent">
            Add event
          </Link>
        ) : null}
        <NavUserChip />
      </div>
    </header>
  );
}
