import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Navigation from './components/Navigation'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LearnX - Learn Anywhere. Teach Everywhere.',
  description: 'A lightweight, AI-powered virtual classroom for rural education',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
   return (
    <html lang="en">
      <body className={inter.className}>
        <Navigation />
        {children}
      </body>
    </html>
  )
}
