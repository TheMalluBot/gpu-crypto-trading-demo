import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface BotOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onRemindLater: () => void;
}

export const BotOnboardingModal: React.FC<BotOnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  onRemindLater,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Your Trading Bot! 🤖',
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
            <span className="text-3xl">👋</span>
            <div>
              <h3 className="font-semibold text-blue-800">Hello, Trader!</h3>
              <p className="text-blue-700">
                Your AI-powered trading assistant is ready to help you trade smarter, not harder.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                ✓
              </span>
              <span>Automated trading based on technical analysis</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                ✓
              </span>
              <span>Risk management with stop losses and take profits</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                ✓
              </span>
              <span>Paper trading mode for safe testing</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Safety First: Paper Trading Mode 📊',
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <span className="text-3xl">🛡️</span>
            <div>
              <h3 className="font-semibold text-green-800">Your Safety Net</h3>
              <p className="text-green-700">
                Paper trading lets you test strategies with virtual money—no real funds at risk!
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Paper Trading</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>✅ Virtual money only</li>
                <li>✅ Test strategies safely</li>
                <li>✅ Learn without risk</li>
                <li>✅ Always enabled by default</li>
              </ul>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-2">Live Trading</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>❌ Real money at risk</li>
                <li>❌ Requires experience</li>
                <li>❌ Not implemented yet</li>
                <li>❌ Use paper trading first!</li>
              </ul>
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-800 text-sm">
              <strong>Recommendation:</strong> Always start with paper trading to understand how the
              bot works before considering live trading.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Understanding Bot States 🚦',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Your bot can be in several states. Here's what each means:
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl">⏸️</span>
              <div>
                <h4 className="font-semibold text-gray-800">Stopped</h4>
                <p className="text-sm text-gray-600">
                  Bot is idle and not monitoring markets. Safe default state.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <span className="text-2xl">🟢</span>
              <div>
                <h4 className="font-semibold text-green-800">Active & Trading</h4>
                <p className="text-sm text-green-600">
                  Bot is monitoring markets and executing trades automatically.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
              <span className="text-2xl">⚡</span>
              <div>
                <h4 className="font-semibold text-orange-800">Circuit Breaker</h4>
                <p className="text-sm text-orange-600">
                  Trading paused due to risk limits. Automatic safety feature.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
              <span className="text-2xl">🚨</span>
              <div>
                <h4 className="font-semibold text-red-800">Emergency Stop</h4>
                <p className="text-sm text-red-600">
                  All trading stopped immediately. Requires manual reset.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Control & Safety Features 🛠️',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-3">Control Options</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-green-500 text-white rounded text-xs flex items-center justify-center">
                    ▶️
                  </span>
                  <span>
                    <strong>Start Bot:</strong> Begin monitoring markets
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-gray-500 text-white rounded text-xs flex items-center justify-center">
                    ⏸️
                  </span>
                  <span>
                    <strong>Stop Bot:</strong> Pause trading activity
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-red-500 text-white rounded text-xs flex items-center justify-center">
                    🚨
                  </span>
                  <span>
                    <strong>Emergency Stop:</strong> Immediate halt
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-3">Safety Features</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">🛡️</span>
                  <span>
                    <strong>Stop Loss:</strong> Automatic loss protection
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">🎯</span>
                  <span>
                    <strong>Take Profit:</strong> Secure gains automatically
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">⚡</span>
                  <span>
                    <strong>Circuit Breakers:</strong> Daily loss limits
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">⏰</span>
                  <span>
                    <strong>Position Limits:</strong> Maximum hold times
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Important:</strong> The bot will NEVER start automatically. You have complete
              control over when it starts and stops.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Ready to Start! 🚀',
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
            <span className="text-3xl">🎉</span>
            <div>
              <h3 className="font-semibold text-gray-800">You're All Set!</h3>
              <p className="text-gray-700">
                Your trading bot is configured and ready to use in paper trading mode.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">Next Steps:</h4>
            <div className="space-y-2">
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <span className="font-medium">Review Configuration:</span>
                  <p className="text-sm text-gray-600">
                    Click "Configure Bot" to adjust timeframes, risk settings, and strategy presets
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <span className="font-medium">Start Paper Trading:</span>
                  <p className="text-sm text-gray-600">
                    Click "Start Bot" when you're ready to begin virtual trading
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <span className="font-medium">Monitor Performance:</span>
                  <p className="text-sm text-gray-600">
                    Watch the charts and metrics to understand how your strategy performs
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">
              <strong>Remember:</strong> You're in complete control. The bot will only do what you
              tell it to do, when you tell it to do it.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={steps[currentStep].title} maxWidth="lg">
      <div className="space-y-6">
        {/* Improved Header with dismissal hint */}
        {currentStep === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-blue-800 text-sm flex items-center">
              <span className="mr-2">💡</span>
              <span>
                <strong>New here?</strong> Take a quick tour, or feel free to dismiss and explore on
                your own!
              </span>
            </p>
          </div>
        )}

        {/* Progress indicator */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>

        {/* Content */}
        <div className="min-h-[400px]">{steps[currentStep].content}</div>

        {/* Improved Navigation */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <Button onClick={prevStep} disabled={currentStep === 0} variant="ghost" className="w-20">
            Back
          </Button>

          <div className="flex space-x-2">
            {currentStep === 0 && (
              <>
                <Button onClick={onRemindLater} variant="ghost" className="text-sm px-3 py-2">
                  Remind me tomorrow
                </Button>
                <Button onClick={handleClose} variant="secondary" className="text-sm px-3 py-2">
                  Not now
                </Button>
              </>
            )}

            {currentStep > 0 && (
              <Button onClick={handleClose} variant="secondary" className="text-sm px-3 py-2">
                Skip rest
              </Button>
            )}

            <Button onClick={nextStep} variant="primary" className="min-w-[80px] text-sm px-4 py-2">
              {currentStep === steps.length - 1 ? 'Get Started!' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
