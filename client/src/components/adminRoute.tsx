import { Navigate } from "react-router-dom";
import { useAuth } from "./authContext";

type Props = {
  children: React.ReactNode;
};

export default function AdminRoute({ children }: Props) {
  const { loggedIn, isAdmin, loadingUser } = useAuth();

  // still loading auth → don't render yet
  if (loadingUser) {
    return <div>Loading…</div>;
  }

  // not logged in → redirect to login
  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }

  // logged in but NOT admin → block
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
