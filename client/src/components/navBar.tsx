import { Link } from "react-router-dom";
import { useAuth } from "./authContext";
import NavUserChip from "./navUserChip";
import "./navBar.css";

export default function NavBar() {
  const { loggedIn, isAdmin, sub, loadingUser } = useAuth();

  return (
    <header className="nav">
      <div className="navLeft">
        <div className="navBrand">EventApp</div>
      </div>

      <div className="navCenter">
        <Link className="navLink navLinkCente" to="/profile">
          Profile
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
