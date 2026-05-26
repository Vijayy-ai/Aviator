"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";

import { firebaseAuth } from "@/lib/firebase";

/** Waits for Firebase to restore the persisted session before reading `currentUser`. */
export function useFirebaseUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (u) => {
      setUser(u);
      setReady(true);
    });
    return unsub;
  }, []);

  return { user, ready };
}
