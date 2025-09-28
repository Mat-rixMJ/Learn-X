import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
          <div className="absolute top-3/4 right-1/3 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-6000"></div>
        </div>
      </div>

      {/* Hero Section */}
      <main className="relative z-10">
        {/* Hero */}
        <section className="min-h-screen flex items-center justify-center px-6 py-20">
          <div className="max-w-6xl mx-auto text-center">
            {/* Main Heading */}
            <h1 className="text-6xl md:text-8xl font-extrabold text-white mb-6 leading-tight">
              Learn <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 animate-pulse">Anywhere</span>
              <br />
              Teach <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-600 animate-pulse">Everywhere</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Transform education with our AI-powered virtual classroom. Designed for <span className="text-yellow-400 font-semibold">low-bandwidth environments</span>, 
              perfect for bridging the urban-rural education gap.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Link href="/signup" className="group px-12 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl hover:from-purple-700 hover:to-pink-700 text-lg font-bold shadow-2xl transform hover:scale-105 transition-all duration-300 hover:shadow-purple-500/25 inline-block text-center">
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Get Started Free
                </span>
              </Link>
              <button className="group px-12 py-4 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white rounded-2xl hover:bg-white/20 text-lg font-bold transition-all duration-300 hover:border-white/50">
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M12 5C8.686 5 6 7.686 6 11c0 3.314 2.686 6 6 6s6-2.686 6-6c0-3.314-2.686-6-6-6z" />
                  </svg>
                  Watch Demo
                </span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-yellow-400 mb-2">10K+</div>
                <div className="text-gray-400 text-sm">Active Students</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-pink-400 mb-2">500+</div>
                <div className="text-gray-400 text-sm">Expert Teachers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-purple-400 mb-2">50+</div>
                <div className="text-gray-400 text-sm">Countries</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-400 mb-2">98%</div>
                <div className="text-gray-400 text-sm">Satisfaction</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Why Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500">Learn-X</span>?
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Experience the future of education with cutting-edge technology designed for everyone, everywhere.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-8 mb-20">
              {/* Feature 1 */}
              <div className="group bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transform hover:-translate-y-2 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/20">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Low-Bandwidth Optimized</h3>
                <p className="text-gray-300 text-lg leading-relaxed">Smart compression technology ensures smooth learning even with slow internet connections. Perfect for rural areas.</p>
              </div>

              {/* Feature 2 */}
              <div className="group bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transform hover:-translate-y-2 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Offline Learning</h3>
                <p className="text-gray-300 text-lg leading-relaxed">Download complete lesson packages including videos, transcripts, and interactive materials for offline access.</p>
              </div>

              {/* Feature 3 */}
              <div className="group bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transform hover:-translate-y-2 transition-all duration-500 hover:shadow-2xl hover:shadow-green-500/20">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">AI-Powered Insights</h3>
                <p className="text-gray-300 text-lg leading-relaxed">Automatic transcription, smart summaries, and personalized learning recommendations powered by advanced AI.</p>
              </div>

              {/* Feature 4 */}
              <div className="group bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transform hover:-translate-y-2 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-500/20">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Interactive Classrooms</h3>
                <p className="text-gray-300 text-lg leading-relaxed">Real-time collaboration tools, virtual whiteboards, and group discussions that bring students together.</p>
              </div>

              {/* Feature 5 */}
              <div className="group bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transform hover:-translate-y-2 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/20">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Secure & Private</h3>
                <p className="text-gray-300 text-lg leading-relaxed">End-to-end encryption ensures your data stays private. GDPR compliant with robust security measures.</p>
              </div>

              {/* Feature 6 */}
              <div className="group bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transform hover:-translate-y-2 transition-all duration-500 hover:shadow-2xl hover:shadow-pink-500/20">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Progress Tracking</h3>
                <p className="text-gray-300 text-lg leading-relaxed">Detailed analytics and progress reports help students and teachers track learning outcomes effectively.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
                What Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Indian Community</span> Says
              </h2>
              <p className="text-xl text-gray-300">Real stories from students and teachers across India</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Testimonial 1 */}
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    S
                  </div>
                  <div className="ml-4">
                    <h4 className="text-white font-semibold">Priya Sharma</h4>
                    <p className="text-gray-400 text-sm">Student, Rural Rajasthan</p>
                  </div>
                </div>
                <p className="text-gray-300 italic leading-relaxed">
                  &ldquo;Learn-X transformed my education journey! Even with limited internet in my village, I can access world-class education. The offline feature is perfect for rural India.&rdquo;
                </p>
                <div className="flex text-yellow-400 mt-4">
                  ⭐⭐⭐⭐⭐
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                    M
                  </div>
                  <div className="ml-4">
                    <h4 className="text-white font-semibold">Dr. Rajesh Kumar</h4>
                    <p className="text-gray-400 text-sm">Professor, Kerala</p>
                  </div>
                </div>
                <p className="text-gray-300 italic leading-relaxed">
                  &ldquo;The AI-powered insights revolutionized my teaching method. I can now reach students in remote Indian villages and provide personalized education like never before.&rdquo;
                </p>
                <div className="flex text-yellow-400 mt-4">
                  ⭐⭐⭐⭐⭐
                </div>
              </div>

              {/* Testimonial 3 */}
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white font-bold">
                    A
                  </div>
                  <div className="ml-4">
                    <h4 className="text-white font-semibold">Sunita Gupta</h4>
                    <p className="text-gray-400 text-sm">Parent, Uttar Pradesh</p>
                  </div>
                </div>
                <p className="text-gray-300 italic leading-relaxed">
                  &ldquo;As a mother from rural UP, Learn-X gave my children access to quality education that we never thought possible. The platform bridges the urban-rural education gap beautifully.&rdquo;
                </p>
                <div className="flex text-yellow-400 mt-4">
                  ⭐⭐⭐⭐⭐
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl p-12 rounded-3xl border border-white/20 hover:border-white/30 transition-all duration-300">
              <h3 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Ready to Transform <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500">Education</span>?
              </h3>
              <p className="text-xl text-gray-300 mb-10 leading-relaxed">
                Join thousands of students and teachers worldwide who are already experiencing the future of education.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link href="/signup" className="group px-12 py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-2xl hover:from-green-600 hover:to-teal-600 text-xl font-bold shadow-2xl transform hover:scale-105 transition-all duration-300 hover:shadow-green-500/25 inline-block text-center">
                  <span className="flex items-center justify-center">
                    <svg className="w-6 h-6 mr-2 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Start Your Journey
                  </span>
                </Link>
                <button className="px-12 py-4 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white rounded-2xl hover:bg-white/20 text-xl font-bold transition-all duration-300 hover:border-white/50">
                  Schedule Demo
                </button>
              </div>
              <p className="text-gray-400 mt-6 text-sm">Free to start • No credit card required • Cancel anytime</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-black/50 backdrop-blur-xl border-t border-white/10 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Company */}
            <div>
              <h4 className="text-xl font-bold text-white mb-4">Learn-X</h4>
              <p className="text-gray-400 mb-4">Bridging the education gap with AI-powered virtual classrooms.</p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors duration-300 cursor-pointer">
                  <span className="text-white">📧</span>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors duration-300 cursor-pointer">
                  <span className="text-white">🐦</span>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors duration-300 cursor-pointer">
                  <span className="text-white">💼</span>
                </div>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors duration-300">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-300">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-300">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-300">Integrations</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors duration-300">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-300">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-300">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-300">Community</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors duration-300">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-300">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-300">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors duration-300">Terms</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 Learn-X. Made with ❤️ for students worldwide. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
