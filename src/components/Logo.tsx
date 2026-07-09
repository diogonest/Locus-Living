import React, { useState, useEffect } from 'react';
import KeyIcon from './KeyIcon';
import { fetchLogoFromFirestore } from '../firebase';

interface LogoProps {
  light?: boolean;
}

export default function Logo({ light = false }: LogoProps) {
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  useEffect(() => {
    // 1. Try to load from localStorage for instant display
    const cached = localStorage.getItem(light ? 'locus_logo_light' : 'locus_logo_dark');
    if (cached) {
      setCustomLogo(cached);
    }

    // 2. Fetch from Firebase Firestore to make sure it is updated
    const loadFromFirebase = async () => {
      try {
        const result = await fetchLogoFromFirestore();
        if (result) {
          const logoData = light ? result.lightBase64 || result.base64 : result.base64;
          if (logoData) {
            setCustomLogo(logoData);
            localStorage.setItem(light ? 'locus_logo_light' : 'locus_logo_dark', logoData);
            
            // Also cache the other one if available
            if (result.base64) localStorage.setItem('locus_logo_dark', result.base64);
            if (result.lightBase64) localStorage.setItem('locus_logo_light', result.lightBase64);
          }
        }
      } catch (error) {
        console.error('Error loading logo from Firebase:', error);
      }
    };
    loadFromFirebase();

    // 3. Listen for direct uploads/updates from AdminPanel
    const handleLogoUpdate = () => {
      const updated = localStorage.getItem(light ? 'locus_logo_light' : 'locus_logo_dark');
      if (updated) {
        setCustomLogo(updated);
      } else {
        setCustomLogo(null);
      }
    };
    window.addEventListener('locus_logo_updated', handleLogoUpdate);
    return () => {
      window.removeEventListener('locus_logo_updated', handleLogoUpdate);
    };
  }, [light]);

  if (customLogo) {
    return (
      <div className="flex items-center justify-center select-none py-1">
        <img 
          src={customLogo} 
          alt="Locus Living Logo" 
          referrerPolicy="no-referrer"
          className="h-9 sm:h-11 w-auto object-contain max-w-[200px]" 
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center leading-none select-none group">
      {/* Integrated L-[KEY]-CUS text container */}
      <div className={`flex items-center justify-center font-logo text-[28px] sm:text-[32px] font-bold tracking-[0.06em] ${
        light ? 'text-[#FAF7F1]' : 'text-[#3D2F22]'
      }`}>
        <span className="transition-transform duration-300 group-hover:-translate-x-[2px]">L</span>
        {/* Sized and centered key to blend beautifully with the serif uppercase characters */}
        <span className={`w-5 h-8 sm:w-[22px] sm:h-[36px] mx-0.5 relative -top-[2px] transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 ${
          light ? 'text-[#D9C8B4]' : 'text-[#73573F]'
        }`}>
          <KeyIcon />
        </span>
        <span className="transition-transform duration-300 group-hover:translate-x-[2px] -ml-0.5">CUS</span>
      </div>
      
      {/* Tracking-spaced "L I V I N G" underneath */}
      <div className={`font-cap font-semibold text-[8px] sm:text-[9px] tracking-[0.52em] uppercase mt-0.5 text-center w-full indent-[0.52em] transition-colors duration-300 ${
        light ? 'text-[#D9C8B4]' : 'text-[#73573F] group-hover:text-[#594432]'
      }`}>
        LIVING
      </div>
    </div>
  );
}
