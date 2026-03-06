import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  canAccessMenu,
  getPositionLabel,
  getGradeLabel,
} from "@/utils/menuPermissions";
import { hashPassword } from "@/utils/password";
import {
  LayoutDashboard,
  Users,
  FileText,
  Calculator,
  Settings,
  LogOut,
  Church,
  Menu,
  X,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    NAME: "",
    BAP_NAME: "",
    ID: "",
    PASSWORD: "",
  });

  if (!user) return null;

  const openProfile = () => {
    setProfileForm({
      NAME: user.name,
      BAP_NAME: user.baptismalName || "",
      ID: user.id,
      PASSWORD: "",
    });
    setShowProfile(true);
  };

  const handleUpdateProfile = async () => {
    if (!profileForm.NAME) return;
    const payload: Record<string, string> = {
      NAME: profileForm.NAME,
      BAP_NAME: profileForm.BAP_NAME,
    };
    if (profileForm.PASSWORD) {
      payload.PASSWORD = await hashPassword(profileForm.PASSWORD);
    }

    const { error } = await (supabase as any)
      .from("USER_MAIN")
      .update(payload)
      .eq("ID", user.id);
    if (error) {
      console.error("프로필 수정 에러:", error);
      return;
    }

    updateUser({
      name: profileForm.NAME,
      baptismalName: profileForm.BAP_NAME,
    });
    setShowProfile(false);
  };

  const navItems = [
    {
      id: "dashboard",
      label: "대시보드",
      icon: LayoutDashboard,
      show: canAccessMenu(user.position, "dashboard"),
    },
    {
      id: "notifications",
      label: "공지사항",
      icon: Bell,
      show: canAccessMenu(user.position, "notifications"),
    },
    {
      id: "students",
      label: "학생관리",
      icon: Users,
      show: canAccessMenu(user.position, "students"),
    },
    {
      id: "teachers",
      label: "교사관리",
      icon: Users,
      show: canAccessMenu(user.position, "teachers"),
    },
    {
      id: "meetings",
      label: "회의록",
      icon: FileText,
      show: canAccessMenu(user.position, "meetings"),
    },
    {
      id: "accounting",
      label: "전산회계",
      icon: Calculator,
      show: canAccessMenu(user.position, "accounting"),
    },
    {
      id: "admin",
      label: "관리자",
      icon: Settings,
      show: canAccessMenu(user.position, "admin"),
    },
  ];

  return (
    <>
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">내 프로필 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label>이름</Label>
              <Input
                value={profileForm.NAME}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, NAME: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>세례명</Label>
              <Input
                value={profileForm.BAP_NAME}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, BAP_NAME: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>ID</Label>
              <Input
                value={profileForm.ID}
                readOnly
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>
            <div className="space-y-1.5">
              <Label>비밀번호</Label>
              <Input
                type="password"
                value={profileForm.PASSWORD}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, PASSWORD: e.target.value })
                }
                placeholder="변경 시에만 입력"
              />
            </div>
            <Button className="w-full" onClick={handleUpdateProfile}>
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen flex bg-background">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-foreground/20 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200",
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0",
          )}
        >
          <div className="p-5 border-b border-sidebar-border">
            <button
              onClick={() => {
                navigate("/dashboard");
                setSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Church className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-sidebar-foreground text-lg leading-tight">
                  만촌2동 성당
                </h1>
              </div>
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {navItems
              .filter((item) => item.show)
              .map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(`/${item.id}`);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    location.pathname === `/${item.id}`
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="w-4.5 h-4.5" />
                  {item.label}
                </button>
              ))}
          </nav>

          <div className="p-4 border-t border-sidebar-border">
            <button
              type="button"
              onClick={openProfile}
              className="w-full flex items-start gap-3 mb-3 text-left rounded-lg hover:bg-sidebar-accent/50 p-3 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-baseline gap-2">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate">
                    {user.name}
                  </p>
                  {user.baptismalName && (
                    <p className="text-xs text-muted-foreground truncate">
                      {user.baptismalName}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {getPositionLabel(user.position)}
                </p>
              </div>
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={logout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border px-4 lg:px-6 h-14 flex items-center gap-4">
            <button
              className="lg:hidden p-2 -ml-2 hover:bg-muted rounded-lg"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            <h2 className="font-heading font-semibold text-lg">
              {navItems.find((n) => `/${n.id}` === location.pathname)?.label}
            </h2>
          </header>
          <div className="p-3 sm:p-4 lg:p-6 animate-fade-in">{children}</div>
        </main>
      </div>
    </>
  );
};

export default Layout;
