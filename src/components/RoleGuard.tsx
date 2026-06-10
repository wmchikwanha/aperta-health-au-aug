import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface RoleGuardProps {
  children: React.ReactNode;
  /** If user role matches one of these, redirect away from this route */
  blockRoles?: string[];
  /** If set, only these roles may view this route */
  allowRoles?: string[];
  /** Where CHWs should land */
  chwHome?: string;
}

/**
 * Route-level role enforcement.
 * - CHWs are forced into /chw and out of clinical routes.
 * - Clinical roles are kept out of /chw.
 */
export const RoleGuard = ({ children, blockRoles, allowRoles, chwHome = "/chw" }: RoleGuardProps) => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading || !user || !userRole) return;

    // CHWs always belong in /chw
    if (userRole === "chw" && !location.pathname.startsWith("/chw")) {
      navigate(chwHome, { replace: true });
      return;
    }

    if (blockRoles?.includes(userRole)) {
      navigate(userRole === "chw" ? chwHome : "/", { replace: true });
      return;
    }
    if (allowRoles && !allowRoles.includes(userRole)) {
      navigate(userRole === "chw" ? chwHome : "/", { replace: true });
    }
  }, [userRole, loading, user, location.pathname, navigate, blockRoles, allowRoles, chwHome]);

  if (loading || (user && !userRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
};
