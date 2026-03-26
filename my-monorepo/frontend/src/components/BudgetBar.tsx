interface BudgetBarProps {
  budget: number;
  spent: number;
  currency: string;
}

export function BudgetBar({ budget, spent, currency }: BudgetBarProps) {
  const pct = Math.min((spent / budget) * 100, 100);
  const remaining = budget - spent;
  const isOver = spent > budget;

  return (
    <div className="px-4 py-3 border-t border-border bg-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Budget
        </span>
        <span className="text-xs font-mono tabular-nums">
          <span className={isOver ? "text-destructive" : "text-foreground"}>
            ${spent.toLocaleString()}
          </span>
          <span className="text-muted-foreground"> / ${budget.toLocaleString()} {currency}</span>
        </span>
      </div>
      <div className="h-1.5 bg-secondary rounded-sm overflow-hidden">
        <div
          className={`h-full rounded-sm transition-all duration-500 ${
            isOver ? "bg-destructive" : "budget-gradient"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-[10px] font-mono text-muted-foreground tabular-nums">
        {isOver
          ? `$${Math.abs(remaining).toLocaleString()} over budget`
          : `$${remaining.toLocaleString()} remaining`}
      </div>
    </div>
  );
}
