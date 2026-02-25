import { useAuth } from "./authContext";

type LogoutButtonProps = {
  onLogout?: () => void;
};

export default function LogoutButton({ onLogout }: LogoutButtonProps) {
  const { reload } = useAuth();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    await reload();
    onLogout?.();
  }

  return <button onClick={logout}>Logout</button>;
}
