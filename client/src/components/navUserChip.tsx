import { useAuth } from "./authContext";
import { useNavigate } from "react-router-dom";
import "./navBar.css";

type User = {
  name: string;
  email: string;
  picture: string;
};

export default function NavUserChip() {
  const navigate = useNavigate();
  const { loggedIn, isAdmin, sub, name, email, picture, loadingUser, reload } =
    useAuth();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    await reload();
    navigate("/login");
  }

  if (!loggedIn) {
    return (
      <a className="navLogin" href="/login">
        Login
      </a>
    );
  }

  return (
    <div className="navChip">
      <img className="navAvatar" src={picture} alt="" />
      <span className="navName">{name}</span>
      <button
        className="navLogout"
        onClick={logout}
        title="Logout"
        aria-label="Logout"
      >
        ⎋
      </button>
    </div>
  );
}
