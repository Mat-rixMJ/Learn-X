export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 relative overflow-hidden">

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-6 leading-tight">
            Learn Anywhere.<br />Teach Everywhere.
          </h2>
          <p className="text-xl md:text-2xl text-gray-700 mb-10 max-w-3xl mx-auto leading-relaxed">
            Bridge the urban–rural education gap with a smart, sustainable, and inclusive digital classroom designed for low-bandwidth environments.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:from-indigo-700 hover:to-purple-700 text-xl font-semibold shadow-xl transform hover:scale-105 transition-all duration-300">
              Get Started
            </button>
            <button className="px-10 py-4 border-2 border-indigo-600 text-indigo-600 rounded-full hover:bg-indigo-600 hover:text-white text-xl font-semibold transition-all duration-300">
              Learn More
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-10 mb-16">
          <div className="bg-white/70 backdrop-blur-sm p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-white/20">
            <div className="text-4xl mb-4">📶</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Low-Bandwidth Classes</h3>
            <p className="text-gray-600 text-lg">Optimized audio + compressed slides for stable connections.</p>
          </div>
          <div className="bg-white/70 backdrop-blur-sm p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-white/20">
            <div className="text-4xl mb-4">🎧</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Offline Access</h3>
            <p className="text-gray-600 text-lg">Download lecture packs with audio, slides, transcripts, and summaries.</p>
          </div>
          <div className="bg-white/70 backdrop-blur-sm p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-white/20">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">AI-Powered Learning</h3>
            <p className="text-gray-600 text-lg">Automatic transcripts, summaries, and searchable notes.</p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-sm p-12 rounded-3xl shadow-2xl border border-white/30">
          <h3 className="text-3xl font-bold text-gray-800 mb-6">Ready to Transform Education?</h3>
          <p className="text-gray-600 mb-8 text-xl">Join thousands of students and teachers in rural areas accessing quality education.</p>
          <button className="px-12 py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full hover:from-green-600 hover:to-teal-600 text-xl font-semibold shadow-xl transform hover:scale-105 transition-all duration-300">
            Start Your Journey
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-gradient-to-r from-gray-800 to-gray-900 text-white py-12 mt-16">
        <div className="container mx-auto px-6 text-center">
          <p className="text-lg">&copy; 2024 LearnX. Bridging the education gap.</p>
        </div>
      </footer>
    </div>
  );
}
