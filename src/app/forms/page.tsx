
import Link from "next/link";

export default function FormsPage() {
  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tightest leading-tight text-center mb-10 text-zinc-900 dark:text-zinc-100">Forms & Registrations</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-sm shadow p-6 flex flex-col gap-3 transition-colors">
          <h2 className="text-lg md:text-2xl font-bold mb-1 text-zinc-900 dark:text-zinc-100 tracking-tightest leading-tight">LCA Academy Registrations</h2>
          <p className="text-zinc-700 dark:text-zinc-300 mb-2 text-base md:text-lg">Register as a player for the Limpopo Chess Academy.</p>
          <Link href="/forms/register-player" className="w-full block px-4 py-3 bg-blue-700 dark:bg-blue-600 text-white rounded-sm hover:bg-blue-800 dark:hover:bg-blue-700 font-semibold text-base md:text-lg text-center transition">Register Player</Link>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-sm shadow p-6 flex flex-col gap-3 transition-colors">
          <h2 className="text-lg md:text-2xl font-bold mb-1 text-zinc-900 dark:text-zinc-100 tracking-tightest leading-tight">Tournament Registrations</h2>
          <p className="text-zinc-700 dark:text-zinc-300 mb-2 text-base md:text-lg">Register for the Limpopo Chess Academy Open 2025 tournament.</p>
          <Link href="/forms/tournament-registration" className="w-full block px-4 py-3 bg-green-700 dark:bg-green-600 text-white rounded-sm hover:bg-green-800 dark:hover:bg-green-700 font-semibold text-base md:text-lg text-center transition">LCA Open 2025 Registration</Link>
        </div>
      </div>
    </div>
  );
}



