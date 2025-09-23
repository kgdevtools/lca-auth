import Link from "next/link"

export default function FooterNav() {
  return (
    <footer className="bg-muted/30 dark:bg-muted/20 border-t border-border mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-center">
          <nav className="flex items-center gap-6">
            <Link
              href="/about"
              className="text-base font-bold text-muted-foreground hover:text-foreground transition-colors duration-200 hover:underline underline-offset-4"
            >
              About
            </Link>
            <Link
              href="/forms/contact-us"
              className="text-base font-bold text-muted-foreground hover:text-foreground transition-colors duration-200 hover:underline underline-offset-4"
            >
              Contact Us
            </Link>
          </nav>
        </div>

        <div className="mt-2 pt-2 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">© 2025 Limpopo Chess Academy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
