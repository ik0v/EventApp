import { useEffect, useMemo, useState } from "react";
import LogoutButton from "./logoutButton";
import LoginButton from "./loginButton";
import "./userProfile.css";

type Profile = {
  name?: string;
  email?: string;
  picture?: string;
  createdAt?: string;
  lastLoginAt?: string;
  isAdmin?: boolean;
};

function formatDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

export default function UserProfile() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetch("/api/user-profile");
      if (res.status === 401) {
        setUser(null);
        return;
      }
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data: Profile = await res.json();
      setUser(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  // live timer tick (only when logged in)
  useEffect(() => {
    if (!user?.lastLoginAt) return;
    const t = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, [user?.lastLoginAt]);

  const loggedInFor = useMemo(() => {
    if (!user?.lastLoginAt) return null;
    const start = new Date(user.lastLoginAt).getTime();
    if (Number.isNaN(start)) return null;
    return formatDuration(Date.now() - start);
  }, [user?.lastLoginAt, tick]);

  if (loading) {
    return <div className="up-muted">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="up-card">
        <div className="up-title">Profile</div>
        <div className="up-muted">Not logged in</div>
        <div className="up-actions">
          <LoginButton />
        </div>
      </div>
    );
  }

  const role = user.isAdmin ? "Admin" : "User";

  return (
    <div className="up-card">
      <div className="up-header">
        <div className="up-left">
          {user.picture ? (
            <img className="up-avatar" src={user.picture} alt="" />
          ) : (
            <div className="up-avatar placeholder" aria-hidden="true" />
          )}
          <div className="up-headtext">
            <div className="up-name">{user.name ?? "Unknown"}</div>
            <div className="up-email">{user.email ?? ""}</div>
          </div>
        </div>

        <span className={`up-badge ${user.isAdmin ? "admin" : ""}`}>
          {role}
        </span>
      </div>

      <div className="up-grid">
        <div className="up-row">
          <div className="up-label">Created</div>
          <div className="up-value">{formatDate(user.createdAt) || "—"}</div>
        </div>

        <div className="up-row">
          <div className="up-label">Logged in for</div>
          <div className="up-value">
            <span className="up-timer">{loggedInFor ?? "—"}</span>
            <span className="up-dot" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="up-actions">
        <LogoutButton onLogout={loadProfile} />
      </div>
    </div>
  );
}
