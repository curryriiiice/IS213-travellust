import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../lib/auth";

type Props = {
  children: JSX.Element;
};

export default function ProtectedRoute({ children }: Props) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}