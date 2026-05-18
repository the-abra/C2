import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'C2 Command Center',
  description: 'Cybersecurity Command & Control Dashboard — Pentest Tool Orchestration',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#0a0f1a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.alert = function() { console.log('[Blocked Alert]:', ...arguments); };
                window.confirm = function() { console.log('[Blocked Confirm]:', ...arguments); return true; };
                window.prompt = function() { console.log('[Blocked Prompt]:', ...arguments); return null; };
              }
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased min-h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
