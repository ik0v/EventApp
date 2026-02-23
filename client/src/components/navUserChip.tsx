import { useEffect, useState } from "react";
import "./navBar.css";

type User = {
  name: string;
  email: string;
  picture: string;
};

export default function NavUserChip() {
  const [user, setUser] = useState<User | null>(null);

  async function loadProfile() {
    const res = await fetch("/api/profile");
    if (res.status === 401) {
      setUser(null);
      return;
    }
    const data: User = await res.json();
    setUser(data);
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    await loadProfile();
  }

  useEffect(() => {
    loadProfile();
  }, []);

  if (!user) {
    return (
      <a className="navLogin" href="/login">
        Login
      </a>
    );
  }

  return (
    <div className="navChip">
      <img className="navAvatar" src={user.picture} alt="" />
      <span className="navName">{user.name}</span>
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
