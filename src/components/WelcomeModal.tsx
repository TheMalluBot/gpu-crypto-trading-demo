import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Zap, Shield, TrendingUp, Play, BookOpen, Target, Sparkles, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeModalProps {
  onComplete: (choice: 'beginner' | 'intermediate' | 'advanced' | 'skip') => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const steps = [
    {
      icon: <Sparkles className="w-16 h-16 text-yellow-500" />,
      title: "Welcome to Crypto Trader! 🚀",
      subtitle: "Your journey to mastering crypto trading starts here",
      content: "We'll help you get started in just 2 minutes. You'll be trading safely with virtual money - no risk!",
      action: "Let's Get Started",
      showSkip: true
    },
    {
      icon: <Shield className="w-16 h-16 text-green-500" />,
      title: "100% Safe Practice Environment",
      subtitle: "Trade without fear",
      content: "You're in Paper Trading mode - practice with $10,000 virtual money. Learn strategies, test ideas, and build confidence without any financial risk.",
      features: [
        "✓ No real money required",
        "✓ Unlimited practice trades",
        "✓ Reset balance anytime",
        "✓ Learn from mistakes safely"
      ],
      action: "I Understand"
    },
    {
      icon: <Target className="w-16 h-16 text-blue-500" />,
      title: "What's Your Experience Level?",
      subtitle: "We'll customize everything just for you",
      content: null,
      choices: [
        {
          id: 'beginner',
          icon: '🌱',
          label: "I'm New to Trading",
          description: "Simple interface, guided tutorials, and helpful tips at every step",
          features: ['Step-by-step guidance', 'Trading basics course', 'Simple interface', 'Tooltips everywhere']
        },
        {
          id: 'intermediate',
          icon: '📈',
          label: 'I Have Some Experience',
          description: 'Balanced interface with advanced features available when needed',
          features: ['More indicators', 'Strategy customization', 'Performance analytics', 'Some automation']
        },
        {
          id: 'advanced',
          icon: '🚀',
          label: "I'm an Experienced Trader",
          description: 'Full access to all features, minimal hand-holding',
          features: ['All features unlocked', 'Advanced strategies', 'API access', 'Custom indicators']
        }
      ]
    },
    {
      icon: <BookOpen className="w-16 h-16 text-purple-500" />,
      title: "Your Personalized Setup",
      subtitle: "Based on your selection",
      content: null,
      showSummary: true,
      action: "Start Trading!"
    }
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSelectLevel = (level: string) => {
    setSelectedLevel(level);
    handleNext();
  };

  const handleComplete = () => {
    if (selectedLevel) {
      onComplete(selectedLevel as 'beginner' | 'intermediate' | 'advanced');
    }
  };

  const getLevelSummary = () => {
    const choice = steps[2].choices?.find(c => c.id === selectedLevel);
    if (!choice) return null;

    return {
      beginner: {
        settings: [
          'Simple dashboard view',
          'Guided trade placement',
          'Conservative risk limits',
          'Tutorial mode enabled',
          'Helpful tooltips active'
        ],
        firstSteps: [
          'Take the interactive tour',
          'Practice your first trade',
          'Learn about stop losses',
          'Understand the dashboard'
        ]
      },
      intermediate: {
        settings: [
          'Standard dashboard',
          'Multiple trading pairs',
          'Moderate risk limits',
          'Basic automation tools',
          'Performance tracking'
        ],
        firstSteps: [
          'Configure your watchlist',
          'Set up price alerts',
          'Try the trading bot',
          'Analyze your performance'
        ]
      },
      advanced: {
        settings: [
          'Advanced dashboard',
          'All features enabled',
          'Customizable risk limits',
          'Full automation access',
          'API integration ready'
        ],
        firstSteps: [
          'Configure API settings',
          'Set up custom strategies',
          'Enable advanced indicators',
          'Start algorithmic trading'
        ]
      }
    }[selectedLevel];
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        >
          {/* Progress bar */}
          <div className="h-2 bg-gray-100">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="p-8 overflow-y-auto max-h-[calc(90vh-2rem)]">
            {/* Step indicator */}
            <div className="flex justify-between items-center mb-8">
              <span className="text-sm text-gray-500">
                Step {currentStep + 1} of {steps.length}
              </span>
              {currentStepData.showSkip && (
                <button
                  onClick={() => onComplete('skip')}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Skip tour
                </button>
              )}
            </div>

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <motion.div
                key={currentStep}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 15 }}
              >
                {currentStepData.icon}
              </motion.div>
            </div>

            {/* Content */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-3xl font-bold text-center mb-2">
                {currentStepData.title}
              </h2>
              {currentStepData.subtitle && (
                <p className="text-gray-600 text-center mb-6">
                  {currentStepData.subtitle}
                </p>
              )}

              {currentStepData.content && (
                <p className="text-gray-700 text-center mb-6 leading-relaxed">
                  {currentStepData.content}
                </p>
              )}

              {/* Features list */}
              {currentStepData.features && (
                <div className="bg-green-50 rounded-xl p-6 mb-6">
                  <div className="space-y-2">
                    {currentStepData.features.map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="text-green-700"
                      >
                        {feature}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Choices */}
              {currentStepData.choices && (
                <div className="space-y-3 mb-6">
                  {currentStepData.choices.map((choice) => (
                    <motion.button
                      key={choice.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectLevel(choice.id)}
                      className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-3xl">{choice.icon}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-lg mb-1 group-hover:text-blue-600">
                            {choice.label}
                          </div>
                          <div className="text-sm text-gray-600 mb-3">
                            {choice.description}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {choice.features.map((feature, idx) => (
                              <div key={idx} className="text-xs text-gray-500 flex items-center gap-1">
                                <Check className="w-3 h-3 text-green-500" />
                                {feature}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Summary */}
              {currentStepData.showSummary && selectedLevel && (
                <div className="space-y-6 mb-6">
                  <div className="bg-blue-50 rounded-xl p-6">
                    <h3 className="font-semibold mb-3 text-blue-900">Your Settings:</h3>
                    <ul className="space-y-2">
                      {getLevelSummary()?.settings.map((setting: unknown, idx: number) => (
                        <li key={idx} className="text-sm text-blue-700 flex items-center gap-2">
                          <Check className="w-4 h-4 text-blue-500" />
                          {setting}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-6">
                    <h3 className="font-semibold mb-3 text-purple-900">Your First Steps:</h3>
                    <ol className="space-y-2">
                      {getLevelSummary()?.firstSteps.map((step: unknown, idx: number) => (
                        <li key={idx} className="text-sm text-purple-700 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center text-xs font-semibold">
                            {idx + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Navigation */}
            <div className="flex gap-3 justify-between mt-8">
              {currentStep > 0 && (
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
              <div className="flex-1" />
              {currentStepData.action && (
                <Button
                  onClick={currentStep === steps.length - 1 ? handleComplete : handleNext}
                  variant="primary"
                  className="flex items-center gap-2"
                  disabled={currentStep === steps.length - 1 && !selectedLevel}
                >
                  {currentStepData.action}
                  {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
                  {currentStep === steps.length - 1 && <Play className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};