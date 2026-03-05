import { useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NavigationLoadingProvider } from "@/contexts/NavigationLoadingContext";
import { HoverCardProvider } from "@/contexts/HoverCardContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";
import { UpdatesNotificationDialog } from "@/components/features/UpdatesNotificationDialog";
import { FullscreenPortal } from "@/components/layout/FullscreenPortal";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const Index = lazy(() => import("./pages/Index"));
const ProductionOrders = lazy(() => import("./pages/ProductionOrders"));
const NewProductionOrder = lazy(() => import("./pages/NewProductionOrder"));
const ProductionOrderDetailsNew = lazy(() => import("./pages/ProductionOrderDetailsNew"));
const EditProductionOrder = lazy(() => import("./pages/EditProductionOrder"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const MRPPlanning = lazy(() => import("./pages/MRPPlanning"));
const Specifications = lazy(() => import("./pages/Specifications"));
const RoutingSheets = lazy(() => import("./pages/RoutingSheets"));
const WorkCenters = lazy(() => import("./pages/WorkCenters"));
const Products = lazy(() => import("./pages/Products"));
const Inventory = lazy(() => import("./pages/Inventory"));
const MaterialReservations = lazy(() => import("./pages/MaterialReservations"));
const MaterialIssues = lazy(() => import("./pages/MaterialIssues"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const ProductionReports = lazy(() => import("./pages/ProductionReports"));
const ResourcePlanning = lazy(() => import("./pages/ResourcePlanning"));
const Features = lazy(() => import("./pages/Features"));
const QualityControl = lazy(() => import("./pages/QualityControl"));

const queryClient = new QueryClient();

const AppRoutes = () => {
  return (
    <NavigationLoadingProvider>
      <PageLoadingScreen />
      <UpdatesNotificationDialog />
      <Suspense fallback={null}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/production-orders" element={<ProtectedRoute><ProductionOrders /></ProtectedRoute>} />
        <Route path="/production-orders/new" element={<ProtectedRoute><NewProductionOrder /></ProtectedRoute>} />
        <Route path="/production-orders/:id" element={<ProtectedRoute><ProductionOrderDetailsNew /></ProtectedRoute>} />
        <Route path="/production-orders/:id/edit" element={<ProtectedRoute><EditProductionOrder /></ProtectedRoute>} />
        <Route path="/user-management" element={<ProtectedRoute requiredRole="admin"><UserManagement /></ProtectedRoute>} />
        <Route path="/planning/mrp" element={<ProtectedRoute><MRPPlanning /></ProtectedRoute>} />
        <Route path="/references/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
        <Route path="/references/specifications" element={<ProtectedRoute><Specifications /></ProtectedRoute>} />
        <Route path="/references/routing-sheets" element={<ProtectedRoute><RoutingSheets /></ProtectedRoute>} />
        <Route path="/references/work-centers" element={<ProtectedRoute><WorkCenters /></ProtectedRoute>} />
        <Route path="/warehouse/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/warehouse/reservations" element={<ProtectedRoute><MaterialReservations /></ProtectedRoute>} />
        <Route path="/warehouse/issues" element={<ProtectedRoute><MaterialIssues /></ProtectedRoute>} />
        <Route path="/analytics/production-reports" element={<ProtectedRoute><ProductionReports /></ProtectedRoute>} />
        <Route path="/quality" element={<ProtectedRoute><QualityControl /></ProtectedRoute>} />
        <Route path="/planning/resources" element={<ProtectedRoute><ResourcePlanning /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/features" element={<Features />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </NavigationLoadingProvider>
  );
};

const App = () => {
  const [showLoading, setShowLoading] = useState(true);

  return (
    <>
      {showLoading && <LoadingScreen onComplete={() => setShowLoading(false)} />}
      <QueryClientProvider client={queryClient}>
        <HoverCardProvider>
          <TooltipProvider>
            <FullscreenPortal>
              <Toaster />
              <Sonner />
            </FullscreenPortal>
            <BrowserRouter>
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </HoverCardProvider>
      </QueryClientProvider>
    </>
  );
};

export default App;
