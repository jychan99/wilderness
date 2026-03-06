import { useState } from "react";
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
import { Church } from "lucide-react";
import { hashPassword } from "@/utils/password";

const Login = () => {
  const { login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [form, setForm] = useState({
    name: "",
    baptismalName: "",
    username: "",
    password: "",
  });

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
    </div>
  );
};

export default Login;
