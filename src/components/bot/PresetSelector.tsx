import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, TrendingUp, Shield, Star, ChevronRight } from 'lucide-react';
import { BOT_PRESETS, BotPreset } from '../../utils/botPresets';
import { Modal } from '../common/Modal';
import { LROConfig } from '../../types/bot';

interface PresetSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (config: Partial<LROConfig>) => void;
}

const PresetSelector: React.FC<PresetSelectorProps> = ({
  isOpen,
  onClose,
  onSelectPreset
}) => {
  const [selectedPreset, setSelectedPreset] = useState<BotPreset | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('All');
  const [filterRisk, setFilterRisk] = useState<string>('All');

  const filteredPresets = BOT_PRESETS.filter(preset => {
    const difficultyMatch = filterDifficulty === 'All' || preset.difficulty === filterDifficulty;
    const riskMatch = filterRisk === 'All' || preset.riskLevel === filterRisk;
    return difficultyMatch && riskMatch;
  });

  const handleSelectPreset = (preset: BotPreset) => {
    onSelectPreset(preset.config);
    onClose();
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-green-400 bg-green-500/20';
      case 'Medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'High': return 'text-red-400 bg-red-500/20';
      default: return 'text-white/60 bg-white/10';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return <Star className="w-4 h-4" />;
      case 'Intermediate': return <TrendingUp className="w-4 h-4" />;
      case 'Advanced': return <Settings className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Settings className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Choose a Trading Strategy</h2>
        </div>

        <p className="text-white/70 mb-6">
          Select a pre-configured strategy that matches your experience level and risk tolerance. 
          You can always customize settings later.
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Experience Level</label>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Risk Tolerance</label>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Risk Levels</option>
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Risk</option>
            </select>
          </div>
        </div>

        {/* Preset Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {filteredPresets.map((preset, index) => (
            <motion.div
              key={preset.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-4 hover:bg-white/10 transition-all duration-200 cursor-pointer"
              onClick={() => setSelectedPreset(preset)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getDifficultyIcon(preset.difficulty)}
                  <h3 className="font-semibold text-white">{preset.name}</h3>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </div>

              <p className="text-sm text-white/70 mb-3">{preset.description}</p>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(preset.riskLevel)}`}>
                  {preset.riskLevel} Risk
                </span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                  {preset.difficulty}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-white/60">Expected Return:</span>
                  <div className="text-white font-medium">{preset.expectedReturn}</div>
                </div>
                <div>
                  <span className="text-white/60">Timeframe:</span>
                  <div className="text-white font-medium">{preset.timeframe}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Selected Preset Details */}
        <AnimatePresence>
          {selectedPreset && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
            >
              <h4 className="font-semibold text-white mb-3">{selectedPreset.name} - Details</h4>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h5 className="text-sm font-medium text-green-400 mb-2">Advantages:</h5>
                  <ul className="space-y-1">
                    {selectedPreset.pros.map((pro, idx) => (
                      <li key={idx} className="text-xs text-white/70 flex items-start">
                        <span className="text-green-400 mr-2">•</span>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h5 className="text-sm font-medium text-orange-400 mb-2">Considerations:</h5>
                  <ul className="space-y-1">
                    {selectedPreset.cons.map((con, idx) => (
                      <li key={idx} className="text-xs text-white/70 flex items-start">
                        <span className="text-orange-400 mr-2">•</span>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => handleSelectPreset(selectedPreset)}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  Apply This Strategy
                </button>
                <button
                  onClick={() => setSelectedPreset(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {filteredPresets.length === 0 && (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/60">No strategies match your current filters.</p>
            <button
              onClick={() => {
                setFilterDifficulty('All');
                setFilterRisk('All');
              }}
              className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PresetSelector;