import { useAuth } from "./authContext";
import { useNavigate } from "react-router-dom";

type LogoutButtonProps = {
  onLogout?: () => void;
  className?: string;
};

export default function LogoutButton({
  onLogout,
  className,
}: LogoutButtonProps) {
  const { reload } = useAuth();
  const navigate = useNavigate();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    await reload();
    onLogout?.();
    navigate("/login");
  }

  return (
    <button type="button" className={className} onClick={logout}>
      Logout
    </button>
  );
}
