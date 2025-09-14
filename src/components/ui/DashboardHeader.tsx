// src/components/ui/DashboardHeader.tsx
'use client';

import { Button } from '@/components/ui/button';

interface DashboardHeaderProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void | Promise<void>;
}

export default function DashboardHeader({ title, description, actionLabel, onAction }: DashboardHeaderProps) {
  const handleAction = async () => {
    try {
      await onAction();
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Button onClick={handleAction}>
        {actionLabel}
      </Button>
    </div>
  );
}
