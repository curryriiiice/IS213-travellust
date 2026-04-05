import { useAuthContext } from "@/contexts/AuthContext";
import { login as authLogin } from "@/lib/auth";

export function useAuth() {
  const { user, isLoading, setUser, logout } = useAuthContext();

  const login = async (email: string, password: string) => {
    const loggedInUser = await authLogin(email, password);
    setUser(loggedInUser);
    return loggedInUser;
  };

  return { user, isLoading, isAuthenticated: !!user, login, logout };
}
