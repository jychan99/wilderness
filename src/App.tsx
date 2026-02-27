import { useState } from "react";
import { useAuth, AuthProvider } from "@/contexts/AuthContext";
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
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState("dashboard");

  if (!user) return <Login />;

  // 사용자가 접근 권한이 없는 메뉴로 접근하려고 하면 대시보드로 리다이렉트
  const accessibleTab = canAccessMenu(
    user.position,
    currentTab as keyof typeof canAccessMenu,
  )
    ? currentTab
    : "dashboard";

  const renderPage = () => {
    switch (accessibleTab) {
      case "dashboard":
        return <Dashboard onTabChange={setCurrentTab} />;
      case "students":
        return <StudentManagement />;
      case "teachers":
        return <TeacherManagement />;
      case "meetings":
        return <MeetingNotes />;
      case "accounting":
        return <Accounting />;
      case "admin":
        return <Admin />;
      case "notifications":
        return <Notification />;
      default:
        return <Dashboard onTabChange={setCurrentTab} />;
    }
  };

  return (
    <Layout currentTab={accessibleTab} onTabChange={setCurrentTab}>
      {renderPage()}
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
