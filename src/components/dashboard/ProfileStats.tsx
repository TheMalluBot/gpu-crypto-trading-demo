import React from 'react';
import { Activity, DollarSign, Target, Award } from 'lucide-react';
import { UserProfile } from '../../hooks/useUserProfile';

interface ProfileStatsProps {
  profile: UserProfile;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({ profile }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6">
      <div className="glass-card p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Activity className="w-5 h-5 text-blue-400" />
          <span className="text-white/80 text-sm">Total Trades</span>
        </div>
        <span className="text-2xl font-bold text-white">{profile.total_trades}</span>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center space-x-2 mb-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          <span className="text-white/80 text-sm">Total Volume</span>
        </div>
        <span className="text-2xl font-bold text-white">
          ${(profile.total_volume / 1000).toFixed(1)}K
        </span>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Target className="w-5 h-5 text-purple-400" />
          <span className="text-white/80 text-sm">Win Rate</span>
        </div>
        <span className="text-2xl font-bold text-white">{profile.win_rate.toFixed(1)}%</span>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Award className="w-5 h-5 text-yellow-400" />
          <span className="text-white/80 text-sm">Risk Level</span>
        </div>
        <span className="text-2xl font-bold text-white">{profile.risk_tolerance}</span>
      </div>
    </div>
  );
};
