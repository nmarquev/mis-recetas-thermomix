import { useState, useEffect } from 'react';

export interface VoiceSettings {
  rate: number;
  pitch: number;
  volume: number;
  voice: string;
  language: string;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  rate: 0.9,
  pitch: 1.0,
  volume: 1.0,
  voice: 'default',
  language: 'es-AR'
};

export const useVoiceSettings = () => {
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const loadSettings = () => {
      const saved = localStorage.getItem('voice_settings');
      if (saved) {
        try {
          const parsedSettings = JSON.parse(saved);
          setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
        } catch (error) {
          console.error('Error loading voice settings:', error);
        }
      }
    };

    loadSettings();

    // Listen for storage changes to sync across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'voice_settings') {
        loadSettings();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const applySettingsToUtterance = (utterance: SpeechSynthesisUtterance) => {
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;
    utterance.lang = settings.language;

    // Set specific voice if selected (skip 'default' value)
    if (settings.voice && settings.voice !== 'default') {
      const voices = speechSynthesis.getVoices();
      const selectedVoice = voices.find(voice => voice.name === settings.voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }
  };

  return {
    settings,
    applySettingsToUtterance
  };
};