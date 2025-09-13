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
        <nav className="bg-white/95 backdrop-blur-lg shadow-xl p-6 flex justify-between items-center border-b border-white/30 sticky top-0 z-50">
          <Link href="/" className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:scale-105 transition-transform duration-300 drop-shadow-lg">
            🎓 LearnX
          </Link>
          <div className="flex space-x-6 items-center">
            <Link href="/" className="text-gray-700 hover:text-blue-600 font-semibold transition-all duration-300 hover:scale-105 relative group">
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link href="/signup" className="px-8 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-full font-semibold hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2">
              <span>🚀</span>
              <span>Join LearnX</span>
            </Link>
            <Link href="/dashboard" className="text-gray-700 hover:text-purple-600 font-semibold transition-all duration-300 hover:scale-105 relative group">
              Dashboard
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link href="/live-class" className="text-gray-700 hover:text-green-600 font-semibold transition-all duration-300 hover:scale-105 relative group">
              Live Class
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-green-500 to-blue-500 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link href="/recorded-lectures" className="text-gray-700 hover:text-indigo-600 font-semibold transition-all duration-300 hover:scale-105 relative group">
              Lectures
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link href="/ai-notes" className="text-gray-700 hover:text-orange-600 font-semibold transition-all duration-300 hover:scale-105 relative group">
              AI Notes
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-orange-500 to-red-500 group-hover:w-full transition-all duration-300"></span>
            </Link>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}
