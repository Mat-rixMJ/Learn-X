'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiService } from '@/utils/api';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  timeLimit: number; // in minutes
  attempts: number;
  maxAttempts: number;
}

export default function DailyQuiz() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState<any>(null);
  
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;

  useEffect(() => {
    loadQuizData();
  }, [classId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (quizStarted && !quizCompleted && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quizStarted, quizCompleted, timeRemaining]);

  const loadQuizData = async () => {
    try {
      setLoading(true);
      
      // Load class details
      const classResponse = await apiService.getClasses();
      if (classResponse.success && classResponse.data) {
        const currentClass = classResponse.data.find((c: any) => c.id === classId);
        if (currentClass) {
          setClassData(currentClass);
        }
      }
      
      // Generate sample quiz (in real app, this would come from API)
      const sampleQuiz: Quiz = {
        id: `quiz-${classId}-${new Date().toDateString()}`,
        title: 'Daily Knowledge Check',
        description: 'Test your understanding of today\'s topics with this quick quiz.',
        timeLimit: 10, // 10 minutes
        attempts: 0,
        maxAttempts: 3,
        questions: [
          {
            id: '1',
            question: 'What is the main concept covered in today\'s lesson?',
            options: [
              'Basic fundamentals and introduction',
              'Advanced implementation techniques',
              'Historical background and context',
              'Future trends and developments'
            ],
            correctAnswer: 0,
            explanation: 'Today\'s lesson focused on establishing the basic fundamentals as a foundation for future learning.'
          },
          {
            id: '2',
            question: 'Which principle is most important for practical application?',
            options: [
              'Speed of implementation',
              'Understanding core concepts first',
              'Using the latest technology',
              'Following industry trends'
            ],
            correctAnswer: 1,
            explanation: 'Understanding core concepts provides a solid foundation for successful practical application.'
          },
          {
            id: '3',
            question: 'How should you approach problem-solving in this subject?',
            options: [
              'Jump straight to the solution',
              'Analyze the problem systematically',
              'Copy existing solutions',
              'Guess and check randomly'
            ],
            correctAnswer: 1,
            explanation: 'Systematic analysis ensures thorough understanding and better problem-solving outcomes.'
          },
          {
            id: '4',
            question: 'What is the best way to retain the knowledge from this course?',
            options: [
              'Memorize all facts',
              'Practice regularly and apply concepts',
              'Read materials once',
              'Attend lectures only'
            ],
            correctAnswer: 1,
            explanation: 'Regular practice and application help solidify understanding and improve retention.'
          },
          {
            id: '5',
            question: 'Which resource is most valuable for continued learning?',
            options: [
              'Online videos only',
              'Textbooks exclusively',
              'Combination of multiple resources',
              'Peer discussions alone'
            ],
            correctAnswer: 2,
            explanation: 'Using multiple learning resources provides diverse perspectives and reinforces understanding.'
          }
        ]
      };
      
      setQuiz(sampleQuiz);
      setSelectedAnswers(new Array(sampleQuiz.questions.length).fill(-1));
      setTimeRemaining(sampleQuiz.timeLimit * 60);
      
    } catch (error) {
      console.error('Error loading quiz data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
    setQuizStarted(true);
  };

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[questionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleSubmitQuiz = () => {
    if (!quiz) return;

    let correctCount = 0;
    quiz.questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correctCount++;
      }
    });

    setScore(Math.round((correctCount / quiz.questions.length) * 100));
    setQuizCompleted(true);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Quiz not found</p>
          <Link href="/student" className="text-blue-600 hover:text-blue-800 mt-2 inline-block">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link
                href="/student"
                className="text-blue-600 hover:text-blue-800 mr-4"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                📝 Daily Quiz
              </h1>
            </div>
            {quizStarted && !quizCompleted && (
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Question {currentQuestion + 1} of {quiz.questions.length}
                </div>
                <div className={`text-sm font-medium px-3 py-1 rounded ${
                  timeRemaining < 120 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  ⏰ {formatTime(timeRemaining)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quiz Start Screen */}
        {!quizStarted && !quizCompleted && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-6xl mb-6">📝</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{quiz.title}</h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">{quiz.description}</p>
            
            {classData && (
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">{classData.title}</h3>
                <p className="text-blue-700">👨‍🏫 {classData.instructor_name}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{quiz.questions.length}</div>
                <div className="text-sm text-gray-600">Questions</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{quiz.timeLimit}</div>
                <div className="text-sm text-gray-600">Minutes</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{quiz.maxAttempts - quiz.attempts}</div>
                <div className="text-sm text-gray-600">Attempts Left</div>
              </div>
            </div>

            <button
              onClick={handleStartQuiz}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-lg"
            >
              Start Quiz
            </button>
          </div>
        )}

        {/* Quiz Questions */}
        {quizStarted && !quizCompleted && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Progress Bar */}
            <div className="bg-gray-200 h-2">
              <div
                className="bg-blue-600 h-2 transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
              ></div>
            </div>

            <div className="p-8">
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {quiz.questions[currentQuestion].question}
                </h3>
                
                <div className="space-y-3">
                  {quiz.questions[currentQuestion].options.map((option, index) => (
                    <label
                      key={index}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedAnswers[currentQuestion] === index
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion}`}
                        value={index}
                        checked={selectedAnswers[currentQuestion] === index}
                        onChange={() => handleAnswerSelect(currentQuestion, index)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                        selectedAnswers[currentQuestion] === index
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedAnswers[currentQuestion] === index && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                        )}
                      </div>
                      <span className="text-gray-900">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <div className="flex space-x-2">
                  {currentQuestion < quiz.questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestion(currentQuestion + 1)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitQuiz}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      Submit Quiz
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quiz Results */}
        {quizCompleted && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className={`text-6xl mb-6 ${score >= 70 ? '🎉' : '📝'}`}>
              {score >= 70 ? '🎉' : '📝'}
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quiz Completed!</h2>
            
            <div className={`text-6xl font-bold mb-4 ${
              score >= 90 ? 'text-green-600' : 
              score >= 70 ? 'text-blue-600' : 
              'text-yellow-600'
            }`}>
              {score}%
            </div>
            
            <p className="text-gray-600 mb-6">
              You answered {quiz.questions.filter((_, index) => selectedAnswers[index] === quiz.questions[index].correctAnswer).length} out of {quiz.questions.length} questions correctly.
            </p>

            {/* Performance Feedback */}
            <div className={`p-4 rounded-lg mb-6 ${
              score >= 90 ? 'bg-green-50 text-green-800' :
              score >= 70 ? 'bg-blue-50 text-blue-800' :
              'bg-yellow-50 text-yellow-800'
            }`}>
              {score >= 90 ? '🌟 Excellent work! You have a strong understanding of the material.' :
               score >= 70 ? '👍 Good job! You understand most of the concepts well.' :
               '📚 Keep studying! Review the materials and try again.'}
            </div>

            <div className="flex justify-center space-x-4">
              <Link
                href={`/classes/${classId}/syllabus`}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                View Syllabus
              </Link>
              <Link
                href="/student"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}