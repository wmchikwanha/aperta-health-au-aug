import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import PatientIntake from "./pages/PatientIntake";
import SelfAssess from "./pages/SelfAssess";
import SelfAssessFollowUp from "./pages/SelfAssessFollowUp";
import FacilityPortal from "./pages/FacilityPortal";
import CHWWorkspace from "./pages/CHWWorkspace";
import FHIRSandbox from "./pages/FHIRSandbox";
import FacilityOnboarding from "./pages/FacilityOnboarding";
import { RoleGuard } from "./components/RoleGuard";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { bindOutboxAutoSync } from "./lib/offline/sync";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => { bindOutboxAutoSync(); }, []);
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RoleGuard blockRoles={["chw"]}><Index /></RoleGuard>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/intake/:token" element={<PatientIntake />} />
            <Route path="/self-assess" element={<SelfAssess />} />
            <Route path="/follow-up" element={<SelfAssessFollowUp />} />
            <Route path="/facility" element={<RoleGuard blockRoles={["chw"]}><FacilityPortal /></RoleGuard>} />
            <Route path="/facility/onboarding" element={<RoleGuard blockRoles={["chw"]}><FacilityOnboarding /></RoleGuard>} />
            <Route path="/fhir-sandbox" element={<RoleGuard blockRoles={["chw"]}><FHIRSandbox /></RoleGuard>} />
            <Route path="/chw" element={<RoleGuard allowRoles={["chw"]}><CHWWorkspace /></RoleGuard>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
