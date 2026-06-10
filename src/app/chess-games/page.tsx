import type { Metadata } from 'next';
import { BoardShell } from '@/components/chess-games/BoardShell';

export const metadata: Metadata = {
  title: 'Chess Games | Limpopo Chess Academy',
  description: 'Browse and replay tournament games with engine analysis.',
};

export default async function ChessGamesPage({
  searchParams,
}: {
  searchParams: Promise<{ pgn?: string; fen?: string }>;
}) {
  const { pgn, fen } = await searchParams;
  return (
    <main className="flex min-h-[calc(100dvh-5rem)] flex-col items-center p-3 md:p-6">
      <div className="w-full max-w-6xl">
        <BoardShell
          initialPgn={typeof pgn === 'string' ? pgn : undefined}
          initialFen={typeof fen === 'string' ? fen : undefined}
        />
      </div>
    </main>
  );
}
