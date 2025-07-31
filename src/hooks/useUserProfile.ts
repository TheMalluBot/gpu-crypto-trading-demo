import { useState, useEffect } from 'react';
import { safeInvoke } from '../utils/tauri';

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  joined_date: string;
  timezone: string;
  preferred_currency: string;
  risk_tolerance: 'Conservative' | 'Moderate' | 'Aggressive';
  experience_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  total_trades: number;
  total_volume: number;
  win_rate: number;
}

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Crypto Trader',
    email: 'trader@example.com',
    joined_date: '2024-01-15',
    timezone: 'UTC',
    preferred_currency: 'USD',
    risk_tolerance: 'Moderate',
    experience_level: 'Intermediate',
    total_trades: 0,
    total_volume: 0,
    win_rate: 0,
  });

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const loadProfile = async () => {
    setLoading(true);
    // Try to load from backend first
    const savedProfile = await safeInvoke<UserProfile>('load_user_profile');

    if (savedProfile) {
      setProfile(savedProfile);
    } else {
      // Fallback to localStorage
      const localProfile = localStorage.getItem('user_profile');
      if (localProfile) {
        setProfile(JSON.parse(localProfile));
      } else {
        // Generate mock profile if nothing saved
        generateMockProfile();
      }
    }

    setLoading(false);
  };

  const generateMockProfile = () => {
    setProfile(prev => ({
      ...prev,
      name: 'Alex Thompson',
      email: 'alex.thompson@email.com',
      joined_date: '2024-01-15',
    }));
  };

  const validateProfile = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!profile.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!profile.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveProfile = async () => {
    if (!validateProfile()) {
      return false;
    }

    // Save profile to backend/local storage
    const result = await safeInvoke('save_user_profile', { profile });

    if (result !== null) {
      return true;
    } else {
      // For now, just save to localStorage as fallback
      localStorage.setItem('user_profile', JSON.stringify(profile));
      return true;
    }
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    const clearedErrors = { ...errors };
    Object.keys(updates).forEach(key => {
      if (clearedErrors[key]) {
        delete clearedErrors[key];
      }
    });
    setErrors(clearedErrors);
  };

  const updateProfileStats = (stats: {
    total_trades: number;
    total_volume: number;
    win_rate: number;
  }) => {
    setProfile(prev => ({ ...prev, ...stats }));
  };

  useEffect(() => {
    loadProfile();
  }, []);

  return {
    profile,
    loading,
    errors,
    loadProfile,
    saveProfile,
    updateProfile,
    updateProfileStats,
    validateProfile,
  };
};
