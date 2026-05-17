import type { Metadata } from "next"
import { Check, X } from "lucide-react"

export const metadata: Metadata = {
  title: "License & Open Source Notices",
}

export default function LicensePage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">License & Open Source</h1>
          <p className="text-muted-foreground">
            We believe in free and open source software. Here&apos;s how we share.
          </p>
        </div>

        {/* Code Section */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Website Code – MIT License</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            All source code in this repository (Next.js components, styles, logic, chess integrations, etc.) is licensed under the MIT License. 
            You can copy, modify, merge, publish, distribute, and even sell the code, as long as you include the original copyright notice.
          </p>
          <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs font-mono text-muted-foreground border border-border">
{`Copyright (c) 2026 Limpopo Chess Academy

Permission is hereby granted, free of charge, to any person 
obtaining a copy of this software and associated documentation 
files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software,
and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be 
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES 
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, 
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR 
OTHER DEALINGS IN THE SOFTWARE.`}
          </pre>
        </section>

        {/* Content Section */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Educational Content – CC BY‑NC 4.0</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            All original teaching materials, chess lessons, articles, diagrams, puzzles, and blog posts are licensed under the{' '}
            <a 
              href="https://creativecommons.org/licenses/by-nc/4.0/legalcode" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Creative Commons Attribution‑NonCommercial 4.0 International License
            </a>.
          </p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0" strokeWidth={3} />
              <span>You can <strong>share</strong> — copy and redistribute in any medium</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0" strokeWidth={3} />
              <span>You can <strong>adapt</strong> — remix, transform, and build upon the material</span>
            </li>
            <li className="flex items-center gap-2">
              <X className="w-4 h-4 text-red-500 flex-shrink-0" strokeWidth={4} />
              <span><strong>Non‑commercial only</strong> — no selling our lessons or using in paid courses without permission</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-amber-500 font-bold text-sm">📌</span>
              <span><strong>Attribution required</strong> — credit Limpopo Chess Academy, link to license, note changes</span>
            </li>
          </ul>
        </section>

        {/* Brand Section */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Academy Name & Logo</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The name <strong>&ldquo;Limpopo Chess Academy&rdquo;</strong>, our logo, and any associated trademarks are <strong>not covered</strong> by the open source licenses above. 
            They remain the exclusive property of Limpopo Chess Academy. You may not use them to imply endorsement or as part of your own product or service without explicit written permission.
          </p>
        </section>

        {/* Third Party Section */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Third‑Party Packages</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This website uses various open source packages. Each retains its own license — typically MIT, Apache‑2.0, or similar. 
            See <code>package.json</code> or the respective project websites for details.
          </p>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Key packages used:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <a href="https://github.com/facebook/react/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">React</a>
                {' / '}
                <a href="https://github.com/vercel/next.js/blob/canary/LICENSE" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Next.js</a>
                {' – '}
                <span className="text-muted-foreground">MIT</span>
              </li>
              <li>
                <a href="https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Tailwind CSS</a>
                {' – '}
                <span className="text-muted-foreground">MIT</span>
              </li>
              <li>
                <a href="https://github.com/supabase/supabase-js/blob/master/LICENSE" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Supabase</a>
                {' – '}
                <span className="text-muted-foreground">Apache‑2.0</span>
              </li>
              <li>
                <a href="https://github.com/livekit/livekit-js/blob/master/LICENSE" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LiveKit</a>
                {' – '}
                <span className="text-muted-foreground">Apache‑2.0</span>
              </li>
              <li>
                <a href="https://github.com/official-stockfish/Stockfish/blob/master/Copying.txt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Stockfish</a>
                {' – '}
                <span className="text-muted-foreground">GPLv3</span>
              </li>
              <li>
                <a href="https://github.com/jhlywa/chess.js/blob/master/LICENSE" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">chess.js</a>
                {' – '}
                <span className="text-muted-foreground">MIT</span>
              </li>
              <li>
                <a href="https://github.com/Clariity/react-chessboard/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">react-chessboard</a>
                {' – '}
                <span className="text-muted-foreground">MIT</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Summary */}
        <div className="bg-muted/50 border border-border rounded-md p-4">
          <p className="text-sm text-center text-muted-foreground">
            <strong>Summary:</strong> Reuse our <span className="font-mono text-foreground">code</span> for anything (MIT). 
            Reuse our <span className="font-mono text-foreground">teaching content</span> for non‑commercial purposes with credit (CC BY‑NC). 
            Cannot use our name/logo without permission. Happy building ♟️
          </p>
        </div>

      </div>
    </div>
  )
}