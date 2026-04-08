import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../lib/auth";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    logout();
    navigate("/login", { replace: true });
  }, [navigate]);

  return null;
}