import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Focus from "./pages/Focus";
import Analytics from "./pages/Analytics";
import Rules from "./pages/Rules";
import LifeDebugger from "./pages/LifeDebugger";
import Reflection from "./pages/Reflection";
import Settings from "./pages/Settings";
import ZenZone from "./pages/ZenZone";
import DietPlanner from "./pages/DietPlanner";
import ExercisePlanner from "./pages/ExercisePlanner";
import EnergyForecast from "./pages/EnergyForecast";
import LifeExperiments from "./pages/LifeExperiments";
import NotFound from "./pages/NotFound";

// Initialize React Query for data fetching and caching
const queryClient = new QueryClient();

/**
 * Main App Component
 * 
 * Sets up the application with:
 * - React Query for API state management
 * - Theme provider for light/dark mode support
 * - Router with protected routes for authenticated pages
 * - UI providers (tooltips, toasts)
 * 
 * All routes prefixed with "/" are public
 * All other routes are wrapped in ProtectedRoute and require authentication
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected Routes - Require Authentication */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/focus" element={<ProtectedRoute><Focus /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/rules" element={<ProtectedRoute><Rules /></ProtectedRoute>} />
            <Route path="/life-debugger" element={<ProtectedRoute><LifeDebugger /></ProtectedRoute>} />
            <Route path="/reflection" element={<ProtectedRoute><Reflection /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/zen-zone" element={<ProtectedRoute><ZenZone /></ProtectedRoute>} />
            <Route path="/diet-planner" element={<ProtectedRoute><DietPlanner /></ProtectedRoute>} />
            <Route path="/exercise-planner" element={<ProtectedRoute><ExercisePlanner /></ProtectedRoute>} />
            <Route path="/energy-forecast" element={<ProtectedRoute><EnergyForecast /></ProtectedRoute>} />
            <Route path="/experiments" element={<ProtectedRoute><LifeExperiments /></ProtectedRoute>} />
            
            {/* Catch-all Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;