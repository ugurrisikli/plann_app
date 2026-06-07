import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export interface AuthUser {
  user_id: string;
  email: string;
  name: string;
}

export function useAuth(redirectOnFail = true) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND}/api/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AuthUser | null) => {
        if (data) {
          setUser(data);
        } else if (redirectOnFail) {
          router.replace("/");
        }
      })
      .catch(() => {
        if (redirectOnFail) router.replace("/");
      })
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
