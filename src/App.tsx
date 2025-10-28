import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import ProductionOrders from "./pages/ProductionOrders";
import NewProductionOrder from "./pages/NewProductionOrder";
import ProductionOrderDetails from "./pages/ProductionOrderDetails";
import MRPPlanning from "./pages/MRPPlanning";
import Specifications from "./pages/Specifications";
import RoutingSheets from "./pages/RoutingSheets";
import WorkCenters from "./pages/WorkCenters";
import Inventory from "./pages/Inventory";
import MaterialReservations from "./pages/MaterialReservations";
import MaterialIssues from "./pages/MaterialIssues";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

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
            <Route path="/" element={<Index />} />
            <Route path="/production-orders" element={<ProductionOrders />} />
            <Route path="/production-orders/new" element={<NewProductionOrder />} />
            <Route path="/production-orders/:id" element={<ProductionOrderDetails />} />
            <Route path="/planning/mrp" element={<MRPPlanning />} />
            <Route path="/references/specifications" element={<Specifications />} />
            <Route path="/references/routing-sheets" element={<RoutingSheets />} />
            <Route path="/references/work-centers" element={<WorkCenters />} />
            <Route path="/warehouse/inventory" element={<Inventory />} />
            <Route path="/warehouse/reservations" element={<MaterialReservations />} />
            <Route path="/warehouse/issues" element={<MaterialIssues />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
