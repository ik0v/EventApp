import { useEffect, useState } from "react";

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}

export default function LoginButton() {
  const [authorizationUrl, setAuthorizationUrl] = useState();

  async function generateAuthorizationUrl() {
    const discoveryDoc = await fetchJson(
      "https://accounts.google.com/.well-known/openid-configuration",
    );

    const parameters = {
      response_type: "token",
      client_id: import.meta.env.VITE_G_CLIENT_ID,
      redirect_uri: window.location.origin + "/login/callback",
      scope: "profile email",
    };

    setAuthorizationUrl(
      discoveryDoc.authorization_endpoint +
        "?" +
        new URLSearchParams(parameters),
    );
  }

  useEffect(() => {
    generateAuthorizationUrl();
  }, []);

  return <a href={authorizationUrl}>Log in with Google</a>;
}
