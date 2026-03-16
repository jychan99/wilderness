import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { USER_MAIN } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Check, Church, Palette } from "lucide-react";
import { hashPassword } from "@/utils/password";

type ThemeName =
  | "crimson"
  | "coral"
  | "gold"
  | "teal"
  | "aliceblue"
  | "navy"
  | "indigo";

const THEME_STORAGE_KEY = "erp-theme-color";

const THEME_PRESETS: Record<
  ThemeName,
  {
    label: string;
    preview: string;
    vars: Record<string, string>;
  }
> = {
  crimson: {
    label: "crimson",
    preview: "#dc143c",
    vars: {
      "--background": "348 100% 97%",
      "--foreground": "346 36% 20%",
      "--card": "0 0% 100%",
      "--card-foreground": "346 36% 20%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "346 36% 20%",
      "--primary": "348 83% 47%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "348 78% 92%",
      "--secondary-foreground": "346 30% 24%",
      "--muted": "348 60% 94%",
      "--muted-foreground": "346 16% 45%",
      "--accent": "348 82% 88%",
      "--accent-foreground": "346 30% 24%",
      "--border": "348 42% 82%",
      "--input": "348 46% 87%",
      "--ring": "348 83% 47%",
      "--sidebar-background": "348 72% 94%",
      "--sidebar-foreground": "346 30% 24%",
      "--sidebar-primary": "348 83% 47%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "348 70% 88%",
      "--sidebar-accent-foreground": "346 30% 24%",
      "--sidebar-border": "348 38% 82%",
      "--sidebar-ring": "348 83% 47%",
    },
  },
  coral: {
    label: "coral",
    preview: "#ff7f50",
    vars: {
      "--background": "16 100% 97%",
      "--foreground": "18 34% 20%",
      "--card": "0 0% 100%",
      "--card-foreground": "18 34% 20%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "18 34% 20%",
      "--primary": "16 100% 62%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "16 92% 91%",
      "--secondary-foreground": "18 30% 24%",
      "--muted": "16 72% 94%",
      "--muted-foreground": "18 15% 45%",
      "--accent": "16 90% 87%",
      "--accent-foreground": "18 30% 24%",
      "--border": "16 52% 82%",
      "--input": "16 56% 87%",
      "--ring": "16 100% 62%",
      "--sidebar-background": "16 84% 93%",
      "--sidebar-foreground": "18 30% 24%",
      "--sidebar-primary": "16 100% 62%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "16 78% 87%",
      "--sidebar-accent-foreground": "18 30% 24%",
      "--sidebar-border": "16 46% 82%",
      "--sidebar-ring": "16 100% 62%",
    },
  },
  gold: {
    label: "gold",
    preview: "#ffd700",
    vars: {
      "--background": "50 100% 97%",
      "--foreground": "40 34% 20%",
      "--card": "0 0% 100%",
      "--card-foreground": "40 34% 20%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "40 34% 20%",
      "--primary": "49 100% 50%",
      "--primary-foreground": "36 42% 16%",
      "--secondary": "50 90% 90%",
      "--secondary-foreground": "40 30% 24%",
      "--muted": "50 72% 94%",
      "--muted-foreground": "40 14% 44%",
      "--accent": "49 94% 86%",
      "--accent-foreground": "40 30% 24%",
      "--border": "48 56% 80%",
      "--input": "48 60% 85%",
      "--ring": "49 100% 50%",
      "--sidebar-background": "50 84% 92%",
      "--sidebar-foreground": "40 30% 24%",
      "--sidebar-primary": "49 100% 50%",
      "--sidebar-primary-foreground": "36 42% 16%",
      "--sidebar-accent": "49 80% 86%",
      "--sidebar-accent-foreground": "40 30% 24%",
      "--sidebar-border": "48 50% 80%",
      "--sidebar-ring": "49 100% 50%",
    },
  },
  teal: {
    label: "teal",
    preview: "#008080",
    vars: {
      "--background": "178 55% 96%",
      "--foreground": "184 36% 19%",
      "--card": "0 0% 100%",
      "--card-foreground": "184 36% 19%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "184 36% 19%",
      "--primary": "178 78% 33%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "178 48% 90%",
      "--secondary-foreground": "184 30% 23%",
      "--muted": "178 42% 93%",
      "--muted-foreground": "184 14% 43%",
      "--accent": "178 58% 86%",
      "--accent-foreground": "184 30% 23%",
      "--border": "178 32% 80%",
      "--input": "178 36% 85%",
      "--ring": "178 78% 33%",
      "--sidebar-background": "178 50% 93%",
      "--sidebar-foreground": "184 30% 23%",
      "--sidebar-primary": "178 78% 33%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "178 50% 86%",
      "--sidebar-accent-foreground": "184 30% 23%",
      "--sidebar-border": "178 30% 80%",
      "--sidebar-ring": "178 78% 33%",
    },
  },
  aliceblue: {
    label: "aliceblue",
    preview: "#f0f8ff",
    vars: {
      "--background": "208 100% 97%",
      "--foreground": "214 36% 20%",
      "--card": "210 100% 99%",
      "--card-foreground": "214 36% 20%",
      "--popover": "210 100% 99%",
      "--popover-foreground": "214 36% 20%",
      "--primary": "211 70% 42%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "208 80% 93%",
      "--secondary-foreground": "214 32% 25%",
      "--muted": "208 65% 95%",
      "--muted-foreground": "214 18% 46%",
      "--accent": "207 82% 90%",
      "--accent-foreground": "214 36% 22%",
      "--border": "208 45% 84%",
      "--input": "208 52% 88%",
      "--ring": "211 70% 42%",
      "--sidebar-background": "209 80% 95%",
      "--sidebar-foreground": "214 30% 24%",
      "--sidebar-primary": "211 70% 42%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "207 70% 90%",
      "--sidebar-accent-foreground": "214 34% 22%",
      "--sidebar-border": "208 40% 85%",
      "--sidebar-ring": "211 70% 42%",
    },
  },
  navy: {
    label: "navy",
    preview: "#000080",
    vars: {
      "--background": "223 55% 96%",
      "--foreground": "224 44% 18%",
      "--card": "0 0% 100%",
      "--card-foreground": "224 44% 18%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "224 44% 18%",
      "--primary": "232 72% 28%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "223 48% 90%",
      "--secondary-foreground": "224 36% 24%",
      "--muted": "223 36% 93%",
      "--muted-foreground": "224 14% 44%",
      "--accent": "224 58% 86%",
      "--accent-foreground": "224 36% 24%",
      "--border": "224 30% 80%",
      "--input": "224 34% 85%",
      "--ring": "232 72% 28%",
      "--sidebar-background": "223 42% 92%",
      "--sidebar-foreground": "224 36% 24%",
      "--sidebar-primary": "232 72% 28%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "224 52% 86%",
      "--sidebar-accent-foreground": "224 36% 24%",
      "--sidebar-border": "224 28% 80%",
      "--sidebar-ring": "232 72% 28%",
    },
  },
  indigo: {
    label: "indigo",
    preview: "#4b0082",
    vars: {
      "--background": "255 60% 97%",
      "--foreground": "257 34% 20%",
      "--card": "0 0% 100%",
      "--card-foreground": "257 34% 20%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "257 34% 20%",
      "--primary": "275 100% 25%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "255 70% 92%",
      "--secondary-foreground": "257 30% 24%",
      "--muted": "255 55% 94%",
      "--muted-foreground": "257 16% 45%",
      "--accent": "258 76% 88%",
      "--accent-foreground": "257 30% 24%",
      "--border": "257 38% 82%",
      "--input": "257 42% 87%",
      "--ring": "275 100% 25%",
      "--sidebar-background": "255 62% 93%",
      "--sidebar-foreground": "257 30% 24%",
      "--sidebar-primary": "275 100% 25%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "258 68% 88%",
      "--sidebar-accent-foreground": "257 30% 24%",
      "--sidebar-border": "257 34% 82%",
      "--sidebar-ring": "275 100% 25%",
    },
  },
};

const THEME_OPTIONS: ThemeName[] = [
  "crimson",
  "coral",
  "gold",
  "teal",
  "aliceblue",
  "navy",
  "indigo",
];

const applyTheme = (themeName: ThemeName) => {
  const root = document.documentElement;
  const preset = THEME_PRESETS[themeName];
  Object.entries(preset.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
};

const Login = () => {
  const { login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>("aliceblue");
  const [form, setForm] = useState({
    name: "",
    baptismalName: "",
    username: "",
    password: "",
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const normalizedTheme =
      savedTheme === "cornflowerblue" ? "navy" : savedTheme;
    const themeToApply =
      normalizedTheme && normalizedTheme in THEME_PRESETS
        ? (normalizedTheme as ThemeName)
        : "aliceblue";
    setSelectedTheme(themeToApply);
    applyTheme(themeToApply);
    localStorage.setItem(THEME_STORAGE_KEY, themeToApply);
  }, []);

  const handleThemeChange = (themeName: ThemeName) => {
    setSelectedTheme(themeName);
    applyTheme(themeName);
    localStorage.setItem(THEME_STORAGE_KEY, themeName);
  };

  const handleAddUser = async () => {
    if (!form.username.trim() || !form.password.trim() || !form.name.trim()) {
      toast({
        title: "필수 항목 누락",
        description: "ID, PASSWORD, 이름은 필수 입력 항목입니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingUser(true);
      const hashedPassword = await hashPassword(form.password);

      const newUser: Omit<USER_MAIN, "USER_CODE"> = {
        ID: form.username,
        NAME: form.name,
        BAP_NAME: form.baptismalName,
        PASSWORD: hashedPassword,
        POSITION: 5,
        USE_YN: false,
      };

      const { data: userData, error: userError } = await (supabase as any)
        .from("USER_MAIN")
        .insert([newUser])
        .select();

      if (userError) throw userError;

      setForm({
        name: "",
        baptismalName: "",
        username: "",
        password: "",
      });
      setShowAdd(false);
      toast({
        title: "회원가입 완료",
        description: "관리자 승인 후 로그인 가능합니다.",
      });
    } catch (addError: any) {
      toast({
        title: "회원가입 실패",
        description:
          "사용자 추가 중 오류가 발생했습니다: " + (addError?.message || ""),
        variant: "destructive",
      });
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const { success, errorCode } = await login(username, password);
    if (!success) {
      if (errorCode === "ERR_INTERNET_DISCONNECTED") {
        setError("인터넷 연결이 끊어졌습니다. 네트워크 상태를 확인해주세요.");
        return;
      }
      if (errorCode === "ACCOUNT_PENDING_APPROVAL") {
        setError("관리자 승인 대기중입니다. 승인 후 로그인 가능합니다.");
        return;
      }
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      <div className="pointer-events-none absolute left-6 top-6 text-5xl sm:text-6xl font-heading font-bold text-primary/10 select-none">
        Wilderness
      </div>
      <div className="w-full max-w-md px-4 sm:px-0 animate-fade-in">
        <div className="card-classic p-6 sm:p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Church className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold font-heading text-foreground">
              만촌2동 성당
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              교리교사 ERP시스템
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">아이디</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디를 입력하세요"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              로그인
            </Button>
          </form>

          <div className="mt-3">
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm"
                >
                  회원가입
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-heading">회원가입</DialogTitle>
                  <p className="text-xs text-primary">
                    * 본인이 평소에 사용하는 ID, PASSWORD는 사용하지마십세오.
                    (개인정보보호)
                  </p>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1.5">
                      <Label>
                        ID <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={form.username}
                        onChange={(e) =>
                          setForm({ ...form, username: e.target.value })
                        }
                        placeholder="로그인 아이디"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        PASSWORD <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="password"
                        value={form.password}
                        onChange={(e) =>
                          setForm({ ...form, password: e.target.value })
                        }
                        placeholder="비밀번호"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1.5">
                      <Label>
                        이름 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        placeholder="이름"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>세례명</Label>
                      <Input
                        value={form.baptismalName}
                        onChange={(e) =>
                          setForm({ ...form, baptismalName: e.target.value })
                        }
                        placeholder="세례명"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleAddUser}
                    className="w-full"
                    disabled={isAddingUser}
                  >
                    {isAddingUser ? "추가 중..." : "추가"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              &copy; 2026. jychan99 All rights reserved.
            </p>
          </div>
        </div>
      </div>

      <div className="fixed right-5 bottom-5 z-50 flex flex-col items-end gap-2">
        {isThemeOpen && (
          <div className="w-52 rounded-lg border border-border bg-card p-2 shadow-lg">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
              테마색 선택
            </p>
            <div className="space-y-1">
              {THEME_OPTIONS.map((themeName) => {
                const preset = THEME_PRESETS[themeName];
                const isActive = selectedTheme === themeName;

                return (
                  <button
                    key={themeName}
                    type="button"
                    className="w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                    onClick={() => handleThemeChange(themeName)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-border"
                        style={{ backgroundColor: preset.preview }}
                      />
                      <span>{preset.label}</span>
                    </span>
                    {isActive && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Button
          type="button"
          size="icon"
          className="h-11 w-11 rounded-full shadow-lg"
          onClick={() => setIsThemeOpen((prev) => !prev)}
          aria-label="테마 색상 선택"
        >
          <Palette className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default Login;
