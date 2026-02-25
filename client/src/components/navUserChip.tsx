import { useAuth } from "./authContext";
import "./navBar.css";

type User = {
  name: string;
  email: string;
  picture: string;
};

export default function NavUserChip() {
  const { loggedIn, isAdmin, sub, name, email, picture, loadingUser, reload } =
    useAuth();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    await reload;
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
