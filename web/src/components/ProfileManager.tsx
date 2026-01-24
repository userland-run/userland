import { useState } from 'react';
import { BUILTIN_PROFILES, Profile, generateApplyScript } from '../lib/profiles';
import { V86Emulator } from '../lib/v86';
import './ProfileManager.css';

interface ProfileManagerProps {
  emulator: V86Emulator | null;
}

export function ProfileManager({ emulator }: ProfileManagerProps) {
  const [installing, setInstalling] = useState<string | null>(null);

  const handleInstall = async (profile: Profile) => {
    if (!emulator || installing) return;

    setInstalling(profile.id);

    // Generate and send the install script to the VM
    const script = generateApplyScript(profile);

    // Send the script line by line to the serial console
    const lines = script.split('\n');
    for (const line of lines) {
      emulator.sendSerial(line + '\n');
      // Small delay between lines for reliability
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    setInstalling(null);
  };

  return (
    <div className="profile-manager">
      <h2>App Profiles</h2>
      <p className="description">
        Install development tools and runtimes in your VM.
        {!emulator && ' Start the VM first to install profiles.'}
      </p>

      <div className="profiles-grid">
        {BUILTIN_PROFILES.map(profile => (
          <div key={profile.id} className="profile-card">
            <div className="profile-header">
              <h3>{profile.name}</h3>
            </div>
            <p className="profile-description">{profile.description}</p>
            <div className="profile-packages">
              {profile.packages.map(pkg => (
                <span key={pkg} className="package-tag">{pkg}</span>
              ))}
            </div>
            <button
              className="btn btn-primary"
              onClick={() => handleInstall(profile)}
              disabled={!emulator || installing !== null}
            >
              {installing === profile.id ? 'Installing...' : 'Install'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
