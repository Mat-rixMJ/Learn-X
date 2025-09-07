# Learn-X: AI-Powered Remote Classroom Platform

🎓 A comprehensive remote learning platform with AI-powered note generation, real-time video streaming, and intelligent content analysis.

## 🌟 Features

### 📚 AI Notes System

- **Video-to-Notes Conversion**: Upload lecture videos and automatically generate intelligent notes
- **Local AI Processing**: Uses Ollama for privacy-first AI analysis
- **Smart Content Extraction**:
  - Automatic summarization
  - Key points identification
  - Important questions generation
  - Topic highlighting
- **Multi-format Support**: Process MP4, AVI, MOV, and other video formats
- **Audio Transcription**: Convert speech to text for analysis

### 🎥 Live Classroom Features

- Real-time video streaming with WebRTC
- Interactive whiteboard
- Screen sharing capabilities
- Chat functionality
- Participant management

### 👥 User Management

- Student and teacher roles
- Authentication system
- User dashboards
- Class enrollment management

### 📊 Analytics & Insights

- Learning progress tracking
- Engagement metrics
- Performance analytics
- Custom reports

## 🚀 Technology Stack

### Frontend

- **Next.js 15.5.2** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Modern styling
- **React Hooks** - State management

### Backend

- **Node.js & Express** - Server framework
- **PostgreSQL** - Primary database
- **JWT Authentication** - Secure auth system
- **Socket.io** - Real-time communication
- **WebRTC** - Video streaming
- **Multer** - File upload handling

### AI & Processing

- **Ollama** - Local AI model execution
- **FFmpeg** - Video processing
- **Speech-to-Text** - Audio transcription
- **Natural Language Processing** - Content analysis

## 📦 Installation & Setup

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- Ollama (for AI features)
- FFmpeg (for video processing)

### 1. Clone the Repository

```bash
git clone https://github.com/Mat-rixMJ/Learn-X.git
cd Learn-X
```

### 2. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Database Setup

```bash
# Start PostgreSQL service
# Create database 'remoteclassroom'
createdb remoteclassroom

# Run database setup scripts
cd ../backend
node ../database/create-users-table.js
node ../database/create-ai-notes-table.js
```

### 4. Environment Configuration

**Backend (.env)**

```env
DATABASE_URL=postgresql://username:password@localhost:5432/remoteclassroom
JWT_SECRET=your-jwt-secret-key
PORT=5000
NODE_ENV=development
```

**Frontend (.env.local)**

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
```

### 5. Install Ollama (for AI features)

```bash
# Windows
winget install Ollama.Ollama

# Mac
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh
```

### 6. Download AI Models

```bash
# Pull required models
ollama pull llama2
ollama pull codellama
```

### 7. Start the Application

```bash
# Start backend server
cd backend
npm start

# Start frontend (in new terminal)
cd frontend
npm run dev
```

## 🎯 Quick Start Guide

1. **Access the Application**: Open http://localhost:3000
2. **Sign Up/Login**: Create an account or use test credentials
3. **Upload Video**: Go to AI Notes → Generate New
4. **Upload Video File**: Select your lecture video
5. **AI Processing**: Wait for Ollama to process and generate notes
6. **View Results**: Browse generated summaries, key points, and questions

## 📁 Project Structure

```
Learn-X/
├── frontend/                 # Next.js React application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── ai-notes/    # AI Notes feature
│   │   │   ├── dashboard/   # User dashboard
│   │   │   ├── live-class/  # Live streaming
│   │   │   └── login/       # Authentication
│   │   └── components/      # Reusable components
├── backend/                 # Express.js API server
│   ├── routes/             # API endpoints
│   ├── middleware/         # Custom middleware
│   ├── config/            # Database configuration
│   └── models/            # Data models
├── database/              # Database setup scripts
├── ai/                   # AI processing modules
└── docs/                # Documentation
```

## 🔧 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile

### AI Notes

- `GET /api/ai-notes` - Fetch user's AI notes
- `POST /api/ai-notes/generate` - Generate notes from text
- `POST /api/ai-notes/upload-video` - Upload and process video
- `DELETE /api/ai-notes/:id` - Delete specific note

### Live Classes

- `GET /api/classes` - List available classes
- `POST /api/classes/join` - Join a live class
- `GET /api/classes/:id/participants` - Get class participants

## 🤖 AI Features

### Video Processing Pipeline

1. **Upload**: User uploads video file
2. **Extract Audio**: FFmpeg extracts audio track
3. **Transcription**: Speech-to-text conversion
4. **AI Analysis**: Ollama processes transcript
5. **Generate Notes**: Create structured notes
6. **Store Results**: Save to database

### Supported AI Models

- **Llama 2**: General text analysis
- **CodeLlama**: Technical content analysis
- **Custom Models**: Domain-specific processing

## 📊 Database Schema

### Users Table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  role VARCHAR(20) DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### AI Notes Table

```sql
CREATE TABLE ai_notes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255),
  subject VARCHAR(100),
  lecture_content TEXT,
  ai_analysis JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Manual Deployment

1. Set production environment variables
2. Build frontend: `npm run build`
3. Start backend in production mode
4. Configure reverse proxy (nginx)
5. Set up SSL certificates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@learnx.com
- 💬 Discord: [Join our community](https://discord.gg/learnx)
- 📖 Documentation: [Wiki](https://github.com/Mat-rixMJ/Learn-X/wiki)
- 🐛 Issues: [GitHub Issues](https://github.com/Mat-rixMJ/Learn-X/issues)

## 🎉 Acknowledgments

- Ollama team for local AI capabilities
- Next.js team for the amazing framework
- PostgreSQL for robust database support
- The open-source community

---

**Built with ❤️ by Mat-rixMJ**

_Transform learning with AI-powered insights_
