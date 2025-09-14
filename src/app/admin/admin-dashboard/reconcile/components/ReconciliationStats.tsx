// src/app/admin/admin-dashboard/reconcile/components/ReconciliationStats.tsx
'use client';

import type { ReconciliationStats } from '@/types/reconciliation';
import { Users, AlertTriangle, Clock, Plus } from 'lucide-react';

interface ReconciliationStatsProps {
  stats: ReconciliationStats;
}

const StatCard = ({ icon: Icon, title, value, color, trend }: { 
  icon: any; 
  title: string; 
  value: number; 
  color: string;
  trend?: number;
}) => (
  <div className="bg-card rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      {trend && (
        <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="mt-4">
      <p className="text-muted-foreground text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold text-card-foreground mt-1">{value.toLocaleString()}</p>
    </div>
  </div>
);

export default function ReconciliationStats({ stats }: ReconciliationStatsProps) {
  const cards = [
    {
      icon: Users,
      title: 'Total Unreconciled',
      value: stats.total_unreconciled,
      color: 'bg-blue-500',
      trend: 12
    },
    {
      icon: AlertTriangle,
      title: 'No Performance Rating',
      value: stats.no_performance_count,
      color: 'bg-amber-500',
      trend: -8
    },
    {
      icon: Clock,
      title: 'Weak Matches',
      value: stats.weak_match_count,
      color: 'bg-orange-500',
      trend: 5
    },
    {
      icon: Plus,
      title: 'Recent Activity',
      value: stats.recent_activity,
      color: 'bg-emerald-500',
      trend: 23
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card, index) => (
        <StatCard key={index} {...card} />
      ))}
    </div>
  );
}
