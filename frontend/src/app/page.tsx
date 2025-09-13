export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Modern Geometric Background Elements - Google Meet Style */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        
        {/* Zoom-style geometric patterns */}
        <div className="absolute top-32 right-32 w-16 h-16 border-2 border-blue-200/30 rounded-lg rotate-45 animate-pulse"></div>
        <div className="absolute bottom-32 left-32 w-12 h-12 border-2 border-emerald-200/30 rounded-full animate-pulse delay-300"></div>
        <div className="absolute top-2/3 right-1/4 w-8 h-8 bg-indigo-200/20 rounded-full animate-pulse delay-700"></div>
      </div>

      {/* Hero Section - Google Meet & Zoom Combined Style */}
      <main className="relative z-10 container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          {/* Modern Logo Design */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl shadow-blue-500/25 mb-8 border border-white/20">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <text x="50%" y="50%" textAnchor="middle" fill="#fff" fontSize="28" fontWeight="900" dy=".3em">Lx</text>
                </svg>
              </div>
              {/* Zoom-style status indicator */}
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-3 border-white shadow-lg animate-pulse"></div>
            </div>
          </div>
          
          {/* Google Meet Style Heading */}
          <h1 className="text-5xl md:text-7xl font-black text-slate-800 mb-6 leading-tight">
            Premium video meetings.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">Now free for everyone.</span>
          </h1>
          
          {/* Zoom Style Subtitle */}
          <p className="text-xl md:text-2xl text-slate-600 mb-8 max-w-4xl mx-auto leading-relaxed font-medium">
            We re-engineered the service we built for secure business meetings, LearnX Video, to make it free and available for all.
          </p>
          
          {/* Modern CTA Buttons - Meet + Zoom Style */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button className="group px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
              <span>New meeting</span>
            </button>
            <button className="group px-8 py-4 border-2 border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-800 rounded-lg font-semibold text-lg hover:bg-slate-50 transition-all duration-200 flex items-center justify-center space-x-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Join a meeting</span>
            </button>
          </div>
          
          {/* Google Meet Style Additional Options */}
          <div className="flex flex-wrap justify-center gap-6 text-slate-600 font-medium">
            <div className="flex items-center space-x-2 hover:text-blue-600 cursor-pointer transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Get the app</span>
            </div>
            <div className="flex items-center space-x-2 hover:text-blue-600 cursor-pointer transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              <span>Learn more</span>
            </div>
          </div>
          
          {/* Trust Indicators - Zoom Style */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-slate-500 text-sm">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">End-to-end encrypted</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zm8 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1V8z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">No account needed</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">100+ participants</span>
            </div>
          </div>
        </div>

        {/* Modern Features Grid - Google Meet Style */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="group bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl border border-slate-200/50 hover:border-blue-300/50 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0021 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-4">HD video and audio</h3>
            <p className="text-slate-600 leading-relaxed">Crystal clear video calls with adaptive bandwidth optimization for all devices and connections.</p>
          </div>
          
          <div className="group bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl border border-slate-200/50 hover:border-emerald-300/50 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-4">Safe and secure</h3>
            <p className="text-slate-600 leading-relaxed">Protected by the same robust security features that keep millions of businesses safe every day.</p>
          </div>
          
          <div className="group bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl border border-slate-200/50 hover:border-purple-300/50 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-4">For teams of all sizes</h3>
            <p className="text-slate-600 leading-relaxed">Host meetings with up to 100 participants and collaborate with powerful teaching tools.</p>
          </div>
        </div>

        {/* Meet Style Quick Actions */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-slate-200/50 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Get a link you can share</h2>
            <p className="text-slate-600 text-lg">Click <strong>New meeting</strong> to get a link you can send to people you want to meet with</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Start an instant meeting</h3>
                <p className="text-slate-600">Create a new meeting and invite others to join</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Schedule in Calendar</h3>
                <p className="text-slate-600">Plan ahead and schedule your learning sessions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Educational Content Section - Zoom Webinar Style */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-12 text-white mb-16">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4">Built for education</h2>
            <p className="text-blue-100 text-xl max-w-3xl mx-auto">Everything educators need to teach effectively, engage students, and manage learning in one platform.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Interactive Whiteboard</h3>
              <p className="text-blue-200">Real-time collaboration with built-in drawing tools and screen sharing</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zm8 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1V8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Breakout Rooms</h3>
              <p className="text-blue-200">Divide students into smaller groups for collaborative activities</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 011 1v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-1zM3 7a1 1 0 011-1h12a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V7zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Recording & Analytics</h3>
              <p className="text-blue-200">Automatic recording with detailed engagement analytics</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Modern Style */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">Lx</span>
                </div>
                <span className="text-xl font-bold">LearnX</span>
              </div>
            </div>
            <div className="flex space-x-8 text-slate-300">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
              <a href="#" className="hover:text-white transition-colors">About</a>
            </div>
          </div>
          <div className="border-t border-slate-700 mt-8 pt-8 text-center">
            <p className="text-slate-400">&copy; 2025 LearnX. Making education accessible to everyone.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}