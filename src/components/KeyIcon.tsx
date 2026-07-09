import React from 'react';

interface KeyIconProps {
  className?: string;
}

export default function KeyIcon({ className = "w-full h-full" }: KeyIconProps) {
  return (
    <svg 
      viewBox="0 0 64 96" 
      className={className} 
      fill="currentColor" 
      aria-hidden="true"
    >
      <path 
        fillRule="evenodd" 
        d="M32 6a20 20 0 1 0 0 40 20 20 0 0 0 0-40Zm0 12a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z"
      />
      <path d="M27 42h10v44H27zM37 70h10v9H37z" />
    </svg>
  );
}
