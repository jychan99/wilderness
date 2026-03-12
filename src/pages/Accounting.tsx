import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { ACCOUNT } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const Accounting = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ACCOUNT | null>(null);
  const [ledgerDateRange, setLedgerDateRange] = useState({
    start: "",
    end: "",
  });
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "income" as "income" | "expense",
    category: "",
    description: "",
    amount: "",
  });

  // 회계 항목 조회
  const { data: entries = [] } = useQuery<ACCOUNT[], Error>({
    queryKey: ["accounting_entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ACCOUNT")
        .select("*")
        .order("DATE", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // 거래 추가 뮤테이션
  const addEntryMutation = useMutation({
    mutationFn: async (entry: ACCOUNT) => {
      const { data, error } = await (supabase as any)
        .from("ACCOUNT")
        .insert([entry])
        .select();

      if (error) {
        console.error("거래 추가 에러:", error);
        console.error("에러 상세:", {
          message: error.message,
          code: error.code,
          details: error.details,
        });
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_entries"] });
      setForm({
        date: new Date().toISOString().split("T")[0],
        type: "income",
        category: "",
        description: "",
        amount: "",
      });
      setShowAdd(false);
      toast({
        title: "거래 추가 완료",
        description: "거래 내역이 성공적으로 추가되었습니다.",
      });
    },
    onError: (error: any) => {
      console.error("Mutation 실패:", error);

      let errorMessage = "거래 내역 추가 중 오류가 발생했습니다.";

      if (error.code === "42501" || error.message?.includes("policy")) {
        errorMessage = "데이터베이스 권한이 없습니다. RLS 정책을 확인해주세요.";
      } else if (error.code === "PGRST301") {
        errorMessage = "인증이 필요합니다. 다시 로그인해주세요.";
      }

      toast({
        title: "거래 추가 실패",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // 거래 수정 뮤테이션
  const editEntryMutation = useMutation({
    mutationFn: async (entry: ACCOUNT) => {
      const { error } = await (supabase as any)
        .from("ACCOUNT")
        .update(entry)
        .eq("ID", entry.ID);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_entries"] });
      setEditingEntry(null);
      toast({
        title: "거래 수정 완료",
        description: "거래 내역이 성공적으로 수정되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "거래 수정 실패",
        description: "거래 내역 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 거래 삭제 뮤테이션
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ACCOUNT").delete().eq("ID", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_entries"] });
      toast({
        title: "거래 삭제 완료",
        description: "거래 내역이 성공적으로 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "거래 삭제 실패",
        description: "거래 내역 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const summary = useMemo(() => {
    const income = entries
      .filter((e) => e.TYPE === "income")
      .reduce((sum, e) => sum + e.AMOUNT, 0);
    const expense = entries
      .filter((e) => e.TYPE === "expense")
      .reduce((sum, e) => sum + e.AMOUNT, 0);
    return { income, expense, balance: income - expense };
  }, [entries]);

  // 날짜 필터링된 항목
  const filteredEntries = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return entries;

    return entries.filter((entry) => {
      const entryDate = entry.DATE;
      if (dateRange.start && entryDate < dateRange.start) return false;
      if (dateRange.end && entryDate > dateRange.end) return false;
      return true;
    });
  }, [entries, dateRange]);

  // 수입 분류별 데이터 (원그래프용)
  const incomeChartData = useMemo(() => {
    const categoryMap = new Map<
      string,
      { category: string; amount: number; entries: ACCOUNT[] }
    >();

    filteredEntries
      .filter((e) => e.TYPE === "income")
      .forEach((e) => {
        const existing = categoryMap.get(e.CATEGORY) || {
          category: e.CATEGORY,
          amount: 0,
          entries: [],
        };
        existing.amount += e.AMOUNT;
        existing.entries.push(e);
        categoryMap.set(e.CATEGORY, existing);
      });

    return Array.from(categoryMap.values()).map((item) => ({
      name: item.category,
      value: item.amount,
      entries: item.entries,
    }));
  }, [filteredEntries]);

  // 지출 분류별 데이터 (원그래프용)
  const expenseChartData = useMemo(() => {
    const categoryMap = new Map<
      string,
      { category: string; amount: number; entries: ACCOUNT[] }
    >();

    filteredEntries
      .filter((e) => e.TYPE === "expense")
      .forEach((e) => {
        const existing = categoryMap.get(e.CATEGORY) || {
          category: e.CATEGORY,
          amount: 0,
          entries: [],
        };
        existing.amount += e.AMOUNT;
        existing.entries.push(e);
        categoryMap.set(e.CATEGORY, existing);
      });

    return Array.from(categoryMap.values()).map((item) => ({
      name: item.category,
      value: item.amount,
      entries: item.entries,
    }));
  }, [filteredEntries]);

  // 차트 색상
  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f97316",
    "#06b6d4",
    "#84cc16",
  ];

  if (!user) return null;

  // 총무 권한 확인
  const isTreasurer = user.position === "총무" || user.position === "3";

  const handleAdd = () => {
    // 입력 검증
    if (!form.date) {
      toast({
        title: "날짜를 입력해주세요",
        variant: "destructive",
      });
      return;
    }
    if (!form.category.trim()) {
      toast({
        title: "분류를 입력해주세요",
        variant: "destructive",
      });
      return;
    }
    if (!form.description.trim()) {
      toast({
        title: "내용을 입력해주세요",
        variant: "destructive",
      });
      return;
    }
    if (!form.amount || parseInt(form.amount.replace(/,/g, ""), 10) <= 0) {
      toast({
        title: "올바른 금액을 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    const entry: ACCOUNT = {
      ID: Date.now().toString(),
      DATE: form.date,
      TYPE: form.type,
      CATEGORY: form.category.trim(),
      CONTENT: form.description.trim(),
      AMOUNT: parseInt(form.amount.replace(/,/g, ""), 10),
      REGISTERED_BY: user?.name || "관리자",
    };
    addEntryMutation.mutate(entry);
  };

  const formatAmount = (amount: number) =>
    amount.toLocaleString("ko-KR") + "원";

  const formatDateOnly = (dateStr: string) => {
    return dateStr.split("T")[0].split(" ")[0];
  };

  const ledgerEntries = useMemo(() => {
    const { start, end } = ledgerDateRange;
    const hasRange = Boolean(start || end);

    let rangeStart = start;
    let rangeEnd = end;

    if (start && end && start > end) {
      rangeStart = end;
      rangeEnd = start;
    }

    const filtered = hasRange
      ? entries.filter((entry) => {
          const entryDate = formatDateOnly(entry.DATE);
          if (rangeStart && entryDate < rangeStart) return false;
          if (rangeEnd && entryDate > rangeEnd) return false;
          return true;
        })
      : entries;

    return [...filtered].sort((a, b) => b.DATE.localeCompare(a.DATE));
  }, [entries, ledgerDateRange]);

  // 금액 입력 포맷팅 (쉼표 추가)
  const formatNumberInput = (value: string) => {
    const digits = value.replace(/\D/g, ""); // 숫자만 추출
    if (!digits) return "";
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ","); // 쉼표 추가
  };

  const handleEdit = (entry: ACCOUNT) => {
    setEditingEntry(entry);
    setForm({
      date: entry.DATE,
      type: entry.TYPE,
      category: entry.CATEGORY,
      description: entry.CONTENT,
      amount: entry.AMOUNT.toLocaleString("ko-KR"),
    });
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;
    if (
      !form.date ||
      !form.category.trim() ||
      !form.description.trim() ||
      !form.amount
    ) {
      toast({
        title: "모든 항목을 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    const updatedEntry: ACCOUNT = {
      ...editingEntry,
      DATE: form.date,
      TYPE: form.type,
      CATEGORY: form.category.trim(),
      CONTENT: form.description.trim(),
      AMOUNT: parseInt(form.amount.replace(/,/g, ""), 10),
    };
    editEntryMutation.mutate(updatedEntry);
  };

  const handleDelete = (id: string) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      deleteEntryMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-sm text-muted-foreground">총 수입</span>
          </div>
          <p className="text-xl font-bold text-success">
            {formatAmount(summary.income)}
          </p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span className="text-sm text-muted-foreground">총 지출</span>
          </div>
          <p className="text-xl font-bold text-destructive">
            {formatAmount(summary.expense)}
          </p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">잔액</span>
          </div>
          <p className="text-xl font-bold text-primary">
            {formatAmount(summary.balance)}
          </p>
        </div>
      </div>

      {/* Chart Toggle */}
      <div className="card-classic p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold">수입/지출 통계</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChart(!showChart)}
          >
            <BarChart3 className="w-4 h-4 mr-1.5" />
            {showChart ? "닫기" : "통계 보기"}
          </Button>
        </div>
        {showChart && (
          <div className="space-y-4">
            {/* 날짜 필터 */}
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1.5">
                <Label>시작 날짜</Label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, start: e.target.value })
                  }
                  className="h-11 text-base"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>종료 날짜</Label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, end: e.target.value })
                  }
                  className="h-11 text-base"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setDateRange({ start: "", end: "" })}
              >
                초기화
              </Button>
            </div>

            {/* 탭으로 나뉜 통계 */}
            <Tabs defaultValue="income" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="income">총 수입 통계</TabsTrigger>
                <TabsTrigger value="expense">총 지출 통계</TabsTrigger>
              </TabsList>

              {/* 수입 통계 */}
              <TabsContent value="income" className="mt-4">
                {incomeChartData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={incomeChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {incomeChartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 border rounded-lg shadow-lg">
                                  <p className="font-semibold text-sm mb-2">
                                    {data.name}
                                  </p>
                                  <p className="text-sm text-success font-bold mb-2">
                                    {formatAmount(data.value)}
                                  </p>
                                  <div className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                                    {data.entries.map(
                                      (entry: ACCOUNT, idx: number) => (
                                        <div key={idx}>
                                          • {entry.CONTENT} (
                                          {formatAmount(entry.AMOUNT)})
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    해당 기간에 수입 내역이 없습니다.
                  </div>
                )}
              </TabsContent>

              {/* 지출 통계 */}
              <TabsContent value="expense" className="mt-4">
                {expenseChartData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {expenseChartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 border rounded-lg shadow-lg">
                                  <p className="font-semibold text-sm mb-2">
                                    {data.name}
                                  </p>
                                  <p className="text-sm text-destructive font-bold mb-2">
                                    {formatAmount(data.value)}
                                  </p>
                                  <div className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                                    {data.entries.map(
                                      (entry: ACCOUNT, idx: number) => (
                                        <div key={idx}>
                                          • {entry.CONTENT} (
                                          {formatAmount(entry.AMOUNT)})
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    해당 기간에 지출 내역이 없습니다.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Add + Table */}
      <div className="card-classic p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold">🧾 회계 장부</h3>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                내역 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">내역 추가</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label>날짜</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="h-11 text-base"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>구분</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) =>
                      setForm({ ...form, type: v as "income" | "expense" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">수입</SelectItem>
                      <SelectItem value="expense">지출</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>분류</Label>
                  <Input
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    placeholder="예: 헌금, 교재비"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>내용</Label>
                  <Input
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="거래 내용"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>금액</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        amount: formatNumberInput(e.target.value),
                      })
                    }
                    placeholder="금액 (원)"
                  />
                </div>
                <Button
                  onClick={handleAdd}
                  className="w-full"
                  disabled={addEntryMutation.isPending}
                >
                  {addEntryMutation.isPending ? "추가 중..." : "추가"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:w-[30rem]">
            <div className="space-y-1.5">
              <Label htmlFor="ledger-start-date">시작 날짜</Label>
              <Input
                id="ledger-start-date"
                type="date"
                value={ledgerDateRange.start}
                onChange={(e) =>
                  setLedgerDateRange((prev) => ({
                    ...prev,
                    start: e.target.value,
                  }))
                }
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ledger-end-date">종료 날짜</Label>
              <Input
                id="ledger-end-date"
                type="date"
                value={ledgerDateRange.end}
                onChange={(e) =>
                  setLedgerDateRange((prev) => ({
                    ...prev,
                    end: e.target.value,
                  }))
                }
                className="h-11 text-base"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setLedgerDateRange({ start: "", end: "" })}
              disabled={!ledgerDateRange.start && !ledgerDateRange.end}
            >
              기간 초기화
            </Button>
            <p className="text-sm text-muted-foreground">
              조회 결과 {ledgerEntries.length}건
            </p>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">내역 수정</DialogTitle>
            </DialogHeader>
            {editingEntry && (
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label>날짜</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="h-11 text-base"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>구분</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) =>
                      setForm({ ...form, type: v as "income" | "expense" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">수입</SelectItem>
                      <SelectItem value="expense">지출</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>분류</Label>
                  <Input
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    placeholder="예: 헌금, 교재비"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>내용</Label>
                  <Input
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="거래 내용"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>금액</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        amount: formatNumberInput(e.target.value),
                      })
                    }
                    placeholder="금액 (원)"
                  />
                </div>
                <Button
                  onClick={handleSaveEdit}
                  className="w-full"
                  disabled={editEntryMutation.isPending}
                >
                  {editEntryMutation.isPending ? "수정 중..." : "수정"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">
                  날짜
                </th>
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">
                  구분
                </th>
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">
                  분류
                </th>
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">
                  내용
                </th>
                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">
                  금액
                </th>
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">
                  등록자
                </th>
                <th className="text-center py-2.5 px-3 text-muted-foreground font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.map((entry) => (
                <tr
                  key={entry.ID}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-2.5 px-3">{formatDateOnly(entry.DATE)}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        entry.TYPE === "income"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {entry.TYPE === "income" ? "수입" : "지출"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">{entry.CATEGORY}</td>
                  <td className="py-2.5 px-3">{entry.CONTENT}</td>
                  <td
                    className={`py-2.5 px-3 text-right font-medium ${
                      entry.TYPE === "income"
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    {entry.TYPE === "income" ? "+" : "-"}
                    {formatAmount(entry.AMOUNT)}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">
                    {entry.REGISTERED_BY}
                  </td>
                  <td className="py-2.5 px-3 text-center space-x-1">
                    {isTreasurer && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 inline-flex"
                          onClick={() => handleEdit(entry)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 inline-flex text-destructive"
                          onClick={() => handleDelete(entry.ID)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {ledgerEntries.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    해당 기간에 조회되는 거래 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden space-y-2">
          {ledgerEntries.map((entry) => (
            <div key={entry.ID} className="p-3 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    entry.TYPE === "income"
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {entry.TYPE === "income" ? "수입" : "지출"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateOnly(entry.DATE)}
                </span>
              </div>
              <p className="text-sm font-medium">{entry.CONTENT}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">
                  {entry.CATEGORY} · {entry.REGISTERED_BY}
                </span>
                <div className="flex gap-1">
                  <span
                    className={`text-sm font-bold ${
                      entry.TYPE === "income"
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    {entry.TYPE === "income" ? "+" : "-"}
                    {formatAmount(entry.AMOUNT)}
                  </span>
                  {isTreasurer && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(entry)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(entry.ID)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {ledgerEntries.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              해당 기간에 조회되는 거래 내역이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Accounting;
