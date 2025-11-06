import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import ProductionOrders from "./pages/ProductionOrders";
import NewProductionOrder from "./pages/NewProductionOrder";
import ProductionOrderDetailsNew from "./pages/ProductionOrderDetailsNew";
import EditProductionOrder from "./pages/EditProductionOrder";
import UserManagement from "./pages/UserManagement";
import MRPPlanning from "./pages/MRPPlanning";
import Specifications from "./pages/Specifications";
import RoutingSheets from "./pages/RoutingSheets";
import WorkCenters from "./pages/WorkCenters";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import MaterialReservations from "./pages/MaterialReservations";
import MaterialIssues from "./pages/MaterialIssues";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProductionReports from "./pages/ProductionReports";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
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
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
