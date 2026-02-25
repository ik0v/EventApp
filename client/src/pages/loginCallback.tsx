import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/authContext";

export default function LoginCallback() {
  const navigate = useNavigate();
  const { reload } = useAuth();

  const callbackParameters = Object.fromEntries(
    new URLSearchParams(window.location.hash.substring(1)),
  );

  async function handleCallback() {
    const { access_token } = callbackParameters;

    await fetch("/api/login/accessToken", {
      method: "POST",
      body: JSON.stringify({ access_token }),
      headers: { "content-type": "application/json" },
    });
    await reload();

    navigate("/events");
  }

  useEffect(() => {
    handleCallback();
  }, []);

  return <div>Please wait...</div>;
}
