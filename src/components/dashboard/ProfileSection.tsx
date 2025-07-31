import React, { useState } from 'react';
import { ProfileHeader } from './ProfileHeader';
import { ProfileStats } from './ProfileStats';
import { ProfileEditModal } from './ProfileEditModal';
import { useUserProfile } from '../../hooks/useUserProfile';

/**
 * ProfileSection handles all user profile related functionality
 * Encapsulates profile display, editing, and stats
 */
export const ProfileSection: React.FC = () => {
  const { profile, errors, saveProfile, updateProfile } = useUserProfile();
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  const handleProfileSave = async (updatedProfile: typeof profile) => {
    // Update the profile first
    updateProfile(updatedProfile);
    // Then save it
    const success = await saveProfile();
    if (success) {
      setShowProfileEdit(false);
    }
    return success;
  };

  return (
    <>
      {/* Profile Header */}
      <ProfileHeader profile={profile} onEditClick={() => setShowProfileEdit(true)} />

      {/* Profile Stats */}
      <ProfileStats profile={profile} />

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
        profile={profile}
        onProfileChange={updateProfile}
        onSave={handleProfileSave}
        errors={errors}
      />
    </>
  );
};
