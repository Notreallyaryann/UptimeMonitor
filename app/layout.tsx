import { Providers } from '@/app/Components/Providers'
import './globals.css'

export const metadata = {
  title: 'Uptime Monitor',
  description: 'Monitor your websites uptime and performance',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
