type LogoutButtonProps = {
  onLogout?: () => void;
};

export default function LogoutButton({ onLogout }: LogoutButtonProps) {
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    onLogout?.();
  }

  return <button onClick={logout}>Logout</button>;
}
