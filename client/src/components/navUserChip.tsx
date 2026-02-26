import { useAuth } from "./authContext";
import "./navBar.css";

export default function NavUserChip() {
  const { loggedIn, name, picture } = useAuth();

  if (!loggedIn) return null;

  return (
    <div className="navChip">
      <img className="navAvatar" src={picture} alt="" />
      <span className="navName">{name}</span>
    </div>
  );
}
