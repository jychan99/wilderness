import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AccountingEntry } from '@/types';
import { mockAccounting } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

const Accounting = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AccountingEntry[]>(mockAccounting);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'income' as 'income' | 'expense',
    category: '',
    description: '',
    amount: '',
  });

  const summary = useMemo(() => {
    const income = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const expense = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    return { income, expense, balance: income - expense };
  }, [entries]);

  if (!user) return null;

  const handleAdd = () => {
    if (!form.category || !form.description || !form.amount) return;
    const entry: AccountingEntry = {
      id: Date.now().toString(),
      date: form.date,
      type: form.type,
      category: form.category,
      description: form.description,
      amount: parseInt(form.amount),
      registeredBy: user.name,
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

        <div className="overflow-x-auto">
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
              {entries.sort((a, b) => b.date.localeCompare(a.date)).map(entry => (
                <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3">{entry.date}</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      entry.type === 'income'
                        ? 'bg-success/10 text-success'
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {entry.type === 'income' ? '수입' : '지출'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">{entry.category}</td>
                  <td className="py-2.5 px-3">{entry.description}</td>
                  <td className={`py-2.5 px-3 text-right font-medium ${
                    entry.type === 'income' ? 'text-success' : 'text-destructive'
                  }`}>
                    {entry.type === 'income' ? '+' : '-'}{formatAmount(entry.amount)}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{entry.registeredBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Accounting;
