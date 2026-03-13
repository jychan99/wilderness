import { useAuth, AuthProvider } from "@/contexts/AuthContext";
import { Routes, Route, Navigate } from "react-router-dom";
import { canAccessMenu } from "@/utils/menuPermissions";
import Login from "@/pages/Login";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import StudentManagement from "@/pages/StudentManagement";
import TeacherManagement from "@/pages/TeacherManagement";
import MeetingNotes from "@/pages/MeetingNotes";
import Accounting from "@/pages/Accounting";
import Admin from "@/pages/Admin";
import Notification from "@/pages/Notification";
import FreeBoard from "@/pages/FreeBoard";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user } = useAuth();

  if (!user) return <Login />;

  // 권한 체크 컴포넌트
  const ProtectedRoute = ({
    children,
    menuKey,
  }: {
    children: React.ReactNode;
    menuKey: string;
  }) => {
    if (!canAccessMenu(user.position, menuKey as any)) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  };

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/students"
          element={
            <ProtectedRoute menuKey="students">
              <StudentManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teachers"
          element={
            <ProtectedRoute menuKey="teachers">
              <TeacherManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/meetings"
          element={
            <ProtectedRoute menuKey="meetings">
              <MeetingNotes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounting"
          element={
            <ProtectedRoute menuKey="accounting">
              <Accounting />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute menuKey="admin">
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute menuKey="notifications">
              <Notification />
            </ProtectedRoute>
          }
        />
        <Route
          path="/freeboard"
          element={
            <ProtectedRoute menuKey="freeboard">
              <FreeBoard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
