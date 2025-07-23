import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, TrendingUp, Shield, Brain, Target, Trophy, CheckCircle } from 'lucide-react';
import { useBotData } from '../hooks/useBotData';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { VirtualPortfolio } from './bot/VirtualPortfolio';
import { SignalChart } from './bot/SignalChart';

interface LessonProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  completed: boolean;
  content: React.ReactNode;
}

const TutorialPanel: React.FC = () => {
  const [currentLesson, setCurrentLesson] = useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  
  const {
    botStatus,
    chartData,
    virtualPortfolio,
    config,
    loading,
    toggleBot,
    resetVirtualPortfolio,
  } = useBotData();

  useEffect(() => {
    const saved = localStorage.getItem('tutorial-completed-lessons');
    if (saved) {
      setCompletedLessons(new Set(JSON.parse(saved)));
    }
  }, []);

  const markLessonComplete = (lessonId: string) => {
    const updated = new Set(completedLessons);
    updated.add(lessonId);
    setCompletedLessons(updated);
    localStorage.setItem('tutorial-completed-lessons', JSON.stringify([...updated]));
  };

  const lessons: LessonProps[] = [
    {
      id: 'basics',
      title: 'Trading Bot Basics',
      description: 'Learn what trading bots are and how they work',
      icon: <Brain className="w-6 h-6" />,
      difficulty: 'Beginner',
      duration: '5 min',
      completed: completedLessons.has('basics'),
      content: (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-4">What is a Trading Bot?</h3>
            <div className="space-y-4 text-white/80">
              <p>A trading bot is an automated program that executes trades based on predefined rules and market analysis. Think of it as your digital trading assistant that never sleeps!</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-400 mb-2">Advantages</h4>
                  <ul className="text-sm space-y-1">
                    <li>• 24/7 market monitoring</li>
                    <li>• Emotion-free trading</li>
                    <li>• Consistent strategy execution</li>
                    <li>• Faster reaction times</li>
                  </ul>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-400 mb-2">Important Notes</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Not guaranteed profits</li>
                    <li>• Requires proper setup</li>
                    <li>• Market conditions matter</li>
                    <li>• Always use risk management</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'paper-trading',
      title: 'Paper Trading Fundamentals',
      description: 'Master risk-free trading with virtual money',
      icon: <Shield className="w-6 h-6" />,
      difficulty: 'Beginner',
      duration: '8 min',
      completed: completedLessons.has('paper-trading'),
      content: (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-4">Paper Trading: Your Safety Net</h3>
            <div className="space-y-4 text-white/80">
              <p>Paper trading allows you to practice trading strategies without risking real money. It's the perfect way to learn and test your bot's performance.</p>
              
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-green-400 mb-2">Why Start with Paper Trading?</h4>
                <ul className="text-sm space-y-2">
                  <li>• Learn without financial risk</li>
                  <li>• Test different strategies</li>
                  <li>• Understand bot behavior</li>
                  <li>• Build confidence</li>
                  <li>• Perfect your settings</li>
                </ul>
              </div>

              {config.paper_trading_enabled && (
                <div className="mt-6">
                  <h4 className="font-semibold text-white mb-3">Your Virtual Portfolio</h4>
                  <div className="bg-blue-500/10 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-400">${config.virtual_balance.toFixed(0)}</div>
                        <div className="text-sm text-white/60">Starting Balance</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">
                          {virtualPortfolio ? virtualPortfolio.total_trades : 0}
                        </div>
                        <div className="text-sm text-white/60">Paper Trades</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'lro-strategy',
      title: 'LRO Strategy Explained',
      description: 'Understand the Linear Regression Oscillator strategy',
      icon: <TrendingUp className="w-6 h-6" />,
      difficulty: 'Intermediate',
      duration: '12 min',
      completed: completedLessons.has('lro-strategy'),
      content: (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-4">Linear Regression Oscillator (LRO)</h3>
            <div className="space-y-4 text-white/80">
              <p>The LRO strategy uses mathematical analysis to identify overbought and oversold market conditions, helping determine optimal entry and exit points.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-green-400 mb-3">Buy Signals</h4>
                  <ul className="text-sm space-y-2">
                    <li>• LRO crosses above oversold line ({config.oversold})</li>
                    <li>• Signal line confirms upward momentum</li>
                    <li>• Market conditions are favorable</li>
                    <li>• Risk management rules are met</li>
                  </ul>
                </div>
                
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-red-400 mb-3">Sell Signals</h4>
                  <ul className="text-sm space-y-2">
                    <li>• LRO crosses below overbought line ({config.overbought})</li>
                    <li>• Signal line shows downward trend</li>
                    <li>• Take profit or stop loss triggered</li>
                    <li>• Position hold time exceeded</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-blue-400 mb-3">Current Configuration</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-white/60">Timeframe</div>
                    <div className="font-semibold">{config.timeframe}</div>
                  </div>
                  <div>
                    <div className="text-white/60">Period</div>
                    <div className="font-semibold">{config.period}</div>
                  </div>
                  <div>
                    <div className="text-white/60">Overbought</div>
                    <div className="font-semibold">{config.overbought}</div>
                  </div>
                  <div>
                    <div className="text-white/60">Oversold</div>
                    <div className="font-semibold">{config.oversold}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'risk-management',
      title: 'Risk Management',
      description: 'Learn essential risk management techniques',
      icon: <Target className="w-6 h-6" />,
      difficulty: 'Intermediate',
      duration: '10 min',
      completed: completedLessons.has('risk-management'),
      content: (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-4">Protecting Your Capital</h3>
            <div className="space-y-4 text-white/80">
              <p>Risk management is the most important aspect of trading. It's not about being right all the time—it's about managing losses when you're wrong.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-red-400 mb-3">Stop Loss</h4>
                  <p className="text-sm mb-2">Current: {config.stop_loss_percent}%</p>
                  <p className="text-xs">Automatically closes losing positions to limit losses.</p>
                </div>
                
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-green-400 mb-3">Take Profit</h4>
                  <p className="text-sm mb-2">Current: {config.take_profit_percent}%</p>
                  <p className="text-xs">Secures profits when targets are reached.</p>
                </div>
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-400 mb-3">Position Size</h4>
                  <p className="text-sm mb-2">Max: {config.max_position_size}%</p>
                  <p className="text-xs">Limits how much capital is risked per trade.</p>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-yellow-400 mb-3">Daily Safety Limits</h4>
                <ul className="text-sm space-y-1">
                  <li>• Maximum daily loss: {config.max_daily_loss}%</li>
                  <li>• Circuit breaker protection enabled</li>
                  <li>• Maximum position hold: {config.max_position_hold_hours} hours</li>
                  <li>• Emergency stop available anytime</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'practice-mode',
      title: 'Hands-On Practice',
      description: 'Practice with live paper trading session',
      icon: <Trophy className="w-6 h-6" />,
      difficulty: 'Advanced',
      duration: '20 min',
      completed: completedLessons.has('practice-mode'),
      content: (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-4">Live Practice Session</h3>
            <div className="space-y-4 text-white/80">
              <p>Now it's time to put your knowledge into practice! Start a paper trading session and observe how the bot behaves.</p>
              
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white">Bot Status</h4>
                    <p className="text-sm text-white/60">
                      {botStatus?.is_active ? 'Running in paper mode' : 'Stopped'}
                    </p>
                  </div>
                  <Button
                    onClick={toggleBot}
                    disabled={loading}
                    className={botStatus?.is_active ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
                  >
                    {loading ? 'Loading...' : botStatus?.is_active ? 'Stop Bot' : 'Start Practice'}
                  </Button>
                </div>

                {botStatus?.is_active && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <h5 className="font-semibold text-green-400 mb-2">Practice Checklist</h5>
                    <ul className="text-sm space-y-1">
                      <li>✓ Watch for signal generation on the chart</li>
                      <li>✓ Observe how positions are opened/closed</li>
                      <li>✓ Monitor virtual portfolio changes</li>
                      <li>✓ Check risk management in action</li>
                      <li>✓ Review performance metrics</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Show chart and portfolio during practice */}
          {botStatus && (
            <div className="space-y-4">
              <SignalChart
                chartData={chartData}
                config={config}
                showChart={true}
                setShowChart={() => {}}
              />
              <VirtualPortfolio
                virtualPortfolio={virtualPortfolio}
                config={config}
                resetVirtualPortfolio={resetVirtualPortfolio}
              />
            </div>
          )}
        </div>
      )
    }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'text-green-400 bg-green-500/10';
      case 'Intermediate': return 'text-yellow-400 bg-yellow-500/10';
      case 'Advanced': return 'text-red-400 bg-red-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  const currentLessonData = lessons.find(lesson => lesson.id === currentLesson);
  const completionRate = (completedLessons.size / lessons.length) * 100;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center space-x-3 mb-4"
        >
          <GraduationCap className="w-8 h-8 text-blue-400" />
          <h1 className="text-hierarchy-primary">Trading Bot Tutorial</h1>
        </motion.div>
        <p className="text-white/60 mb-6">Learn to master automated trading with hands-on lessons and paper trading practice</p>
        
        {/* Progress Bar */}
        <div className="glass-card p-4 max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Progress</span>
            <span className="text-sm font-semibold text-white">{Math.round(completionRate)}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            ></div>
          </div>
          <p className="text-xs text-white/60 mt-2">
            {completedLessons.size} of {lessons.length} lessons completed
          </p>
        </div>
      </div>

      {/* Lesson Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lessons.map((lesson) => (
          <motion.div
            key={lesson.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * lessons.indexOf(lesson) }}
            className="glass-card p-6 cursor-pointer hover:bg-white/5 transition-all"
            onClick={() => setCurrentLesson(lesson.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
                  {lesson.icon}
                </div>
                {lesson.completed && (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(lesson.difficulty)}`}>
                {lesson.difficulty}
              </span>
            </div>
            
            <h3 className="text-lg font-semibold text-white mb-2">{lesson.title}</h3>
            <p className="text-white/60 text-sm mb-4">{lesson.description}</p>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">{lesson.duration}</span>
              <Button
                onClick={() => setCurrentLesson(lesson.id)}
                size="sm"
                variant="secondary"
              >
                {lesson.completed ? 'Review' : 'Start'}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lesson Modal */}
      <Modal
        isOpen={!!currentLesson}
        onClose={() => setCurrentLesson(null)}
        title={currentLessonData?.title || ''}
        maxWidth="2xl"
      >
        {currentLessonData && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm ${getDifficultyColor(currentLessonData.difficulty)}`}>
                  {currentLessonData.difficulty}
                </span>
                <span className="text-sm text-white/60">{currentLessonData.duration}</span>
              </div>
              {currentLessonData.completed && (
                <span className="flex items-center space-x-1 text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Completed</span>
                </span>
              )}
            </div>
            
            <div className="min-h-[400px]">
              {currentLessonData.content}
            </div>
            
            <div className="flex justify-between">
              <Button onClick={() => setCurrentLesson(null)} variant="secondary">
                Close
              </Button>
              {!currentLessonData.completed && (
                <Button 
                  onClick={() => {
                    markLessonComplete(currentLessonData.id);
                    setCurrentLesson(null);
                  }}
                  className="bg-green-500 hover:bg-green-600"
                >
                  Mark Complete
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TutorialPanel;