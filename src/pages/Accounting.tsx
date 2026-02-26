import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AccountingEntry } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, TrendingUp, TrendingDown, Wallet, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Accounting = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'income' as 'income' | 'expense',
    category: '',
    description: '',
    amount: '',
  });

  // 회계 항목 조회
  const { data: entries = [] } = useQuery({
    queryKey: ['accounting_entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_entries')
        .select('*');
      if (error) throw error;
      return data || [];
    },
  });

  // 거래 추가 뮤테이션
  const addEntryMutation = useMutation({
    mutationFn: async (entry: AccountingEntry) => {
      const { error } = await supabase.from('accounting_entries').insert([entry]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_entries'] });
      setForm({ date: new Date().toISOString().split('T')[0], type: 'income', category: '', description: '', amount: '' });
      setShowAdd(false);
    },
  });

  const summary = useMemo(() => {
    const income = entries.filter(e => e.TYPE === 'income').reduce((sum, e) => sum + e.AMOUNT, 0);
    const expense = entries.filter(e => e.TYPE === 'expense').reduce((sum, e) => sum + e.AMOUNT, 0);
    return { income, expense, balance: income - expense };
  }, [entries]);

  const chartData = useMemo(() => {
    const monthMap = new Map<string, { month: string; 수입: number; 지출: number }>();
    entries.forEach(e => {
      const month = e.DATE.slice(0, 7); // YYYY-MM
      const existing = monthMap.get(month) || { month, 수입: 0, 지출: 0 };
      if (e.TYPE === 'income') existing.수입 += e.AMOUNT;
      else existing.지출 += e.AMOUNT;
      monthMap.set(month, existing);
    });
    return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [entries]);

  if (!user) return null;

  const handleAdd = () => {
    if (!form.category || !form.description || !form.amount) return;
    const entry: ACCOUNT = {
      ID: Date.now().toString(),
      DATE: form.date,
      TYPE: form.type,
      CATEGORY: form.category,
      CONTENT: form.description,
      AMOUNT: parseInt(form.amount),
      REGISTERED_BY: user.name,
    };
    setEntries([entry, ...entries]);
    setForm({ date: new Date().toISOString().split('T')[0], type: 'income', category: '', description: '', amount: '' });
    setShowAdd(false);
  };

  const formatAmount = (amount: number) => amount.toLocaleString('ko-KR') + '원';

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-sm text-muted-foreground">총 수입</span>
          </div>
          <p className="text-xl font-bold text-success">{formatAmount(summary.income)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span className="text-sm text-muted-foreground">총 지출</span>
          </div>
          <p className="text-xl font-bold text-destructive">{formatAmount(summary.expense)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">잔액</span>
          </div>
          <p className="text-xl font-bold text-primary">{formatAmount(summary.balance)}</p>
        </div>
      </div>

      {/* Chart Toggle */}
      <div className="card-classic p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold">수입/지출 통계</h3>
          <Button variant="outline" size="sm" onClick={() => setShowChart(!showChart)}>
            <BarChart3 className="w-4 h-4 mr-1.5" />
            {showChart ? '닫기' : '그래프 보기'}
          </Button>
        </div>
        {showChart && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 25%, 88%)" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={v => `${(v / 10000).toFixed(0)}만`} />
                <Tooltip formatter={(value: number) => value.toLocaleString('ko-KR') + '원'} />
                <Legend />
                <Bar dataKey="수입" fill="hsl(210, 55%, 38%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="지출" fill="hsl(0, 65%, 52%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Add + Table */}
      <div className="card-classic p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold">거래 내역</h3>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                거래 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">거래 추가</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label>날짜</Label>
                  <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>구분</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as 'income' | 'expense' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">수입</SelectItem>
                      <SelectItem value="expense">지출</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>분류</Label>
                  <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="예: 헌금, 교재비" />
                </div>
                <div className="space-y-1.5">
                  <Label>내용</Label>
                  <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="거래 내용" />
                </div>
                <div className="space-y-1.5">
                  <Label>금액</Label>
                  <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="금액 (원)" />
                </div>
                <Button onClick={handleAdd} className="w-full">추가</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">날짜</th>
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">구분</th>
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">분류</th>
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">내용</th>
                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">금액</th>
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">등록자</th>
              </tr>
            </thead>
            <tbody>
              {entries.sort((a, b) => b.DATE.localeCompare(a.DATE)).map(entry => (
                <tr key={entry.ID} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3">{entry.DATE}</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      entry.TYPE === 'income'
                        ? 'bg-success/10 text-success'
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {entry.TYPE === 'income' ? '수입' : '지출'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">{entry.CATEGORY}</td>
                  <td className="py-2.5 px-3">{entry.CONTENT}</td>
                  <td className={`py-2.5 px-3 text-right font-medium ${
                    entry.TYPE === 'income' ? 'text-success' : 'text-destructive'
                  }`}>
                    {entry.TYPE === 'income' ? '+' : '-'}{formatAmount(entry.AMOUNT)}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{entry.REGISTERED_BY}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden space-y-2">
          {entries.sort((a, b) => b.DATE.localeCompare(a.DATE)).map(entry => (
            <div key={entry.ID} className="p-3 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                  entry.TYPE === 'income'
                    ? 'bg-success/10 text-success'
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  {entry.TYPE === 'income' ? '수입' : '지출'}
                </span>
                <span className="text-xs text-muted-foreground">{entry.DATE}</span>
              </div>
              <p className="text-sm font-medium">{entry.CONTENT}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">{entry.CATEGORY} · {entry.REGISTERED_BY}</span>
                <span className={`text-sm font-bold ${
                  entry.TYPE === 'income' ? 'text-success' : 'text-destructive'
                }`}>
                  {entry.TYPE === 'income' ? '+' : '-'}{formatAmount(entry.AMOUNT)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Accounting;
