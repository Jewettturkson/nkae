import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { watchAuth, firebaseReady } from "@/lib/firebase";
import { DEMO } from "@/lib/demo";

export function useAuth() {
  // In demo mode the fetch mock answers /api/auth/user, no Firebase needed.
  const [firebaseUser, setFirebaseUser] = useState<unknown | null>(null);
  const [firebaseSettled, setFirebaseSettled] = useState(DEMO || !firebaseReady);

  useEffect(() => {
    if (DEMO || !firebaseReady) return;
    const unsubscribe = watchAuth((user) => {
      setFirebaseUser(user);
      setFirebaseSettled(true);
    });
    return unsubscribe;
  }, []);

  const enabled = DEMO || (firebaseSettled && !!firebaseUser);
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled,
  });

  if (DEMO) {
    return { user, isLoading, isAuthenticated: !!user };
  }

  return {
    user,
    isLoading: !firebaseSettled || (enabled && isLoading),
    isAuthenticated: firebaseSettled && !!firebaseUser && !!user,
  };
}
