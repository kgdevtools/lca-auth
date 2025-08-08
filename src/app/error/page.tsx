export default function ErrorPage() {
  return (
    <main className="min-h-dvh p-6 flex items-center justify-center">
      <div className="max-w-md text-center space-y-2">
        <h1 className="text-xl font-semibold">Authentication Error</h1>
        <p className="text-sm text-neutral-600">
          Something went wrong during authentication. Please try again.
        </p>
      </div>
    </main>
  )
}


