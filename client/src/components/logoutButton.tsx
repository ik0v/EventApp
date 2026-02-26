import { useAuth } from "./authContext";
import { useNavigate } from "react-router-dom";

type LogoutButtonProps = {
  onLogout?: () => void;
};

export default function LogoutButton({ onLogout }: LogoutButtonProps) {
  const { reload } = useAuth();
  const navigate = useNavigate();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    await reload();
    onLogout?.();
    navigate("/login");
  }

  return <button onClick={logout}>Logout</button>;
}
