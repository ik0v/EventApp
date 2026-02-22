import { useEffect, useState } from "react";
import LogoutButton from "./logoutButton";
import LoginButton from "./loginButton";

type User = {
  name: string;
  email: string;
  picture: string;
};

export default function UserProfile() {
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

  useEffect(() => {
    loadProfile();
  }, []);

  if (!user) {
    return (
      <>
        <div>Not logged in</div>
        <LoginButton />
      </>
    );
  }

  return (
    <div>
      <h3>Logged in as:</h3>
      <div>Name: {user.name}</div>
      <div>Email: {user.email}</div>
      <img src={user.picture} alt="profile" width={50} />
      <div>
        <LogoutButton onLogout={loadProfile} />
      </div>
    </div>
  );
}
