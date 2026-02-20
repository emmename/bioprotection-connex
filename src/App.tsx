import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Rewards from "./pages/Rewards";
import MyRedemptions from "./pages/MyRedemptions";
import ReceiptUpload from "./pages/ReceiptUpload";
import Content from "./pages/Content";
import ContentDetail from "./pages/ContentDetail";
import Missions from "./pages/Missions";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AdminLayout from "./components/admin/AdminLayout";
import History from "./pages/History";
import AdminAuth from "./pages/admin/AdminAuth";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMembers from "./pages/admin/AdminMembers";
import AdminReceipts from "./pages/admin/AdminReceipts";
import AdminContent from "./pages/admin/AdminContent";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminRewards from "./pages/admin/AdminRewards";
import AdminMemberDetail from "./pages/admin/AdminMemberDetail";
import AdminRedemptions from "./pages/admin/AdminRedemptions";
import AdminMissions from "./pages/admin/AdminMissions";
import AppLayout from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Register />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><AppLayout><Notifications /></AppLayout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
            <Route path="/rewards" element={<ProtectedRoute><AppLayout><Rewards /></AppLayout></ProtectedRoute>} />
            <Route path="/my-redemptions" element={<ProtectedRoute><AppLayout><MyRedemptions /></AppLayout></ProtectedRoute>} />
            <Route path="/receipts/upload" element={<ProtectedRoute><AppLayout><ReceiptUpload /></AppLayout></ProtectedRoute>} />
            <Route path="/content" element={<ProtectedRoute><AppLayout><Content /></AppLayout></ProtectedRoute>} />
            <Route path="/content/:id" element={<ProtectedRoute><AppLayout><ContentDetail /></AppLayout></ProtectedRoute>} />
            <Route path="/missions" element={<ProtectedRoute><AppLayout><Missions /></AppLayout></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><AppLayout><History /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/login" element={<AdminAuth />} />
            <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
            <Route path="/admin/members" element={<AdminLayout><AdminMembers /></AdminLayout>} />
            <Route path="/admin/members/:id" element={<AdminLayout><AdminMemberDetail /></AdminLayout>} />
            <Route path="/admin/receipts" element={<AdminLayout><AdminReceipts /></AdminLayout>} />
            <Route path="/admin/content" element={<AdminLayout><AdminContent /></AdminLayout>} />
            <Route path="/admin/rewards" element={<AdminLayout><AdminRewards /></AdminLayout>} />
            <Route path="/admin/redemptions" element={<AdminLayout><AdminRedemptions /></AdminLayout>} />
            <Route path="/admin/missions" element={<AdminLayout><AdminMissions /></AdminLayout>} />
            <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
