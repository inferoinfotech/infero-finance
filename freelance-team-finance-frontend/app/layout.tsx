import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { PinLockProvider } from "@/contexts/pin-lock-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Freelancing Management System",
  description: "Team-based freelancing management platform",
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <PinLockProvider>{children}</PinLockProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
