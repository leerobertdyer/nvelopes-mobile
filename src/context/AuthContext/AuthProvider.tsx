import { useState, useEffect } from "react";
import auth from "@react-native-firebase/auth";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { AuthContext } from "./AuthContext";

type User = FirebaseAuthTypes.User;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((authUser) => {
      setUser(authUser);
      setIsLoadingUser(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, isLoadingUser }}>
      {children}
    </AuthContext.Provider>
  );
}
