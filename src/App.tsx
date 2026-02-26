import { useState } from 'react';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import Login from '@/pages/Login';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import StudentManagement from '@/pages/StudentManagement';
import MeetingNotes from '@/pages/MeetingNotes';
import Accounting from '@/pages/Accounting';
import Admin from '@/pages/Admin';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const AppContent = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  if (!user) return <Login />;

  const renderPage = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard />;
      case 'students': return <StudentManagement />;
      case 'meetings': return <MeetingNotes />;
      case 'accounting': return <Accounting />;
      case 'admin': return <Admin />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout currentTab={currentTab} onTabChange={setCurrentTab}>
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
