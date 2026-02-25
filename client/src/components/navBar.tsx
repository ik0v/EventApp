import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./navBar.css";
import NavUserChip from "./navUserChip";

export default function NavBar() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/profile");
      setLoggedIn(res.ok);
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data?.isAdmin ?? false);
      }
    })();
  }, []);

  return (
    <header className="nav">
      <div className="navLeft">
        <div className="navBrand">EventApp</div>
      </div>

      <div className="navCenter">
        <Link className="navLink navLinkCente" to="/about">
          About
        </Link>
        <Link className="navLink navLinkCenter" to="/events">
          Events
        </Link>
        <Link className="navLink navLinkCenter" to="/">
          Login
        </Link>
      </div>

      <div className="navRight">
        {isAdmin ? (
          <Link className="navLink" to="/add">
            Add event
          </Link>
        ) : null}
        <NavUserChip />
      </div>
    </header>
  );
}
