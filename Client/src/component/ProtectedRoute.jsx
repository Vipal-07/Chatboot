import { Navigate } from "react-router-dom";

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
};

export default function ProtectedRoute({ children }) {
  const token = getCookie("token"); // Retrieve token from cookies
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}