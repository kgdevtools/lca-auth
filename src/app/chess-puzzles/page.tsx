import ChessPuzzleBoard from '@/components/chess-puzzles/ChessPuzzleBoard';

/**
 * This page now acts as a simple "shell" for the client component.
 * It does NOT fetch any data itself. The client component handles everything.
 */
export default function ChessPuzzlesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-4 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Chess Puzzles</h1>
          <p className="text-muted-foreground">Find the best move to solve the puzzle.</p>
        </header>
        
        {/* 
          The client component is rendered without any props.
          It will show a loading state and then fetch its own data.
        */}
        <ChessPuzzleBoard />
      </div>
    </div>
  );
}
