export default function LogoutButton({ onLogout }) {
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    onLogout?.();
  }

  return <button onClick={logout}>Logout</button>;
}
