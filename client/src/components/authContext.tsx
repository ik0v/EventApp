import { createContext, useContext, useEffect, useState } from "react";

type Auth = {
  loggedIn: boolean;
  isAdmin: boolean;
  loadingUser: boolean;
  sub: string | undefined;
  name: string | undefined;
  email: string | undefined;
  picture: string | undefined;
  reload: () => Promise<void>;
};

const AuthContext = createContext<Auth>({
  loggedIn: false,
  isAdmin: false,
  loadingUser: true,
  sub: undefined,
  name: undefined,
  email: undefined,
  picture: undefined,
  reload: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sub, setSub] = useState(undefined);
  const [name, setName] = useState(undefined);
  const [email, setEmail] = useState(undefined);
  const [picture, setPicture] = useState(undefined);
  const [loadingUser, setLoadingUser] = useState(true);

  async function reload() {
    setLoadingUser(true);

    try {
      const res = await fetch("/api/profile");

      if (!res.ok) {
        setLoggedIn(false);
        setIsAdmin(false);
        setSub(undefined);
        setName(undefined);
        setEmail(undefined);
        setPicture(undefined);
      } else {
        const data = await res.json();

        setLoggedIn(true);
        setIsAdmin(data?.isAdmin ?? false);
        setSub(data?.sub ?? "");
        setName(data?.name ?? "");
        setEmail(data?.email ?? "");
        setPicture(data?.picture ?? "");
      }
    } catch {
      setLoggedIn(false);
      setIsAdmin(false);
      setSub(undefined);
      setName(undefined);
      setEmail(undefined);
      setPicture(undefined);
    } finally {
      setLoadingUser(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        loggedIn,
        isAdmin,
        loadingUser,
        sub,
        name,
        email,
        picture,
        reload,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
