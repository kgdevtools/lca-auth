import React from 'react';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

interface ChessPuzzleStatusBarProps {
  timeRemaining: number;
  solvedCount: number;
  failedCount: number;
}

export default function ChessPuzzleStatusBar({
  timeRemaining,
  solvedCount,
  failedCount,
}: ChessPuzzleStatusBarProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const isLowTime = timeRemaining <= 30 && timeRemaining > 0;
  const isTimeUp = timeRemaining === 0;

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Timer */}
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${isTimeUp ? 'text-destructive' : isLowTime ? 'text-orange-500' : 'text-primary'}`} />
          <span className={`text-2xl font-bold tabular-nums ${isTimeUp ? 'text-destructive' : isLowTime ? 'text-orange-500' : 'text-foreground'}`}>
            {formattedTime}
          </span>
        </div>

        {/* Statistics */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-lg font-semibold text-foreground">
              {solvedCount}
            </span>
            <span className="text-sm text-muted-foreground">Solved</span>
          </div>

          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            <span className="text-lg font-semibold text-foreground">
              {failedCount}
            </span>
            <span className="text-sm text-muted-foreground">Failed</span>
          </div>
        </div>
      </div>

      {isTimeUp && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-center text-destructive font-semibold">Time's Up!</p>
        </div>
      )}
    </div>
  );
}
