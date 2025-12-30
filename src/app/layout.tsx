import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Offertanalys - Installationsbolaget Stockholm AB',
  description: 'Offertanalys och jämförelsesystem för VVS-projekt',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="sv">
      <body className="antialiased">{children}</body>
    </html>
  )
}
