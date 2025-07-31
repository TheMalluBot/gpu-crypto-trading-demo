import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Edit3 } from 'lucide-react';
import { UserProfile } from '../../hooks/useUserProfile';

interface ProfileHeaderProps {
  profile: UserProfile;
  onEditClick: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile, onEditClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-morphic p-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {profile.name
                .split(' ')
                .map(n => n[0])
                .join('')}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white"></div>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-white">{profile.name}</h1>
            <p className="text-white/60">{profile.email}</p>
            <div className="flex items-center space-x-4 mt-2">
              <span className="flex items-center space-x-1 text-white/80 text-sm">
                <Calendar className="w-4 h-4" />
                <span>Joined {new Date(profile.joined_date).toLocaleDateString()}</span>
              </span>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                {profile.experience_level}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onEditClick}
          className="p-2 glass-card hover:bg-white/10 rounded-lg transition-colors"
        >
          <Edit3 className="w-5 h-5 text-white/70" />
        </button>
      </div>
    </motion.div>
  );
};
