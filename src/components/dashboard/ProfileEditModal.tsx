import React from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { UserProfile } from '../../hooks/useUserProfile';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onProfileChange: (updates: Partial<UserProfile>) => void;
  onSave: (profile: UserProfile) => Promise<boolean>;
  errors: { [key: string]: string };
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileChange,
  onSave,
  errors,
}) => {
  const handleSave = async () => {
    const success = await onSave(profile);
    if (success) {
      onClose();
    }
  };

  const timezoneOptions = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'EST' },
    { value: 'America/Los_Angeles', label: 'PST' },
    { value: 'Europe/London', label: 'GMT' },
    { value: 'Asia/Tokyo', label: 'JST' },
  ];

  const currencyOptions = [
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
    { value: 'GBP', label: 'GBP' },
    { value: 'BTC', label: 'BTC' },
  ];

  const riskToleranceOptions = [
    { value: 'Conservative', label: 'Conservative' },
    { value: 'Moderate', label: 'Moderate' },
    { value: 'Aggressive', label: 'Aggressive' },
  ];

  const experienceLevelOptions = [
    { value: 'Beginner', label: 'Beginner' },
    { value: 'Intermediate', label: 'Intermediate' },
    { value: 'Advanced', label: 'Advanced' },
    { value: 'Expert', label: 'Expert' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
      <div className="space-y-4">
        <Input
          label="Name"
          value={profile.name}
          onChange={e => onProfileChange({ name: e.target.value })}
          error={errors.name}
          required
        />

        <Input
          label="Email"
          type="email"
          value={profile.email}
          onChange={e => onProfileChange({ email: e.target.value })}
          error={errors.email}
          required
        />

        <Select
          label="Timezone"
          value={profile.timezone}
          onChange={e => onProfileChange({ timezone: e.target.value })}
          options={timezoneOptions}
        />

        <Select
          label="Preferred Currency"
          value={profile.preferred_currency}
          onChange={e => onProfileChange({ preferred_currency: e.target.value })}
          options={currencyOptions}
        />

        <Select
          label="Risk Tolerance"
          value={profile.risk_tolerance}
          onChange={e =>
            onProfileChange({
              risk_tolerance: e.target.value as 'Conservative' | 'Moderate' | 'Aggressive',
            })
          }
          options={riskToleranceOptions}
        />

        <Select
          label="Experience Level"
          value={profile.experience_level}
          onChange={e =>
            onProfileChange({
              experience_level: e.target.value as
                | 'Beginner'
                | 'Intermediate'
                | 'Advanced'
                | 'Expert',
            })
          }
          options={experienceLevelOptions}
        />
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </Modal>
  );
};
