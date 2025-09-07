import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
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
        <nav className="bg-white/90 backdrop-blur-md shadow-lg p-4 flex justify-between items-center border-b border-white/20">
-          <Link href="/" className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105 transition-transform duration-200">
-            LearnX
-          </Link>
-          <div className="flex space-x-8">
-            <Link href="/" className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-200 hover:underline">Home</Link>
-            <Link href="/login" className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-200 hover:underline">Login</Link>
-            <Link href="/signup" className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-200 hover:underline">Sign Up</Link>
-            <Link href="/dashboard" className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-200 hover:underline">Dashboard</Link>
-            <Link href="/live-class" className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-200 hover:underline">Live Class</Link>
-            <Link href="/recorded-lectures" className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-200 hover:underline">Lectures</Link>
-            <Link href="/ai-notes" className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-200 hover:underline">AI Notes</Link>
-          </div>
-        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}
