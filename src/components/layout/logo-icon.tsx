import React from 'react'

interface LogoIconProps {
  className?: string
  variant?: 'gradient' | 'white'
}

export default function LogoIcon({ className = 'w-6 h-6', variant = 'gradient' }: LogoIconProps) {
  const isWhite = variant === 'white'
  
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" /> {/* Brand Purple */}
          <stop offset="0.5" stopColor="#3B82F6" /> {/* Brand Blue */}
          <stop offset="1" stopColor="#10B981" /> {/* Brand Emerald */}
        </linearGradient>
      </defs>

      {/* Optimistic "Happy Split" Monogram: Smiling Division Sign */}
      {/* Top Dot representing Self */}
      <circle 
        cx="16" 
        cy="7.5" 
        r="4" 
        fill={isWhite ? '#FFFFFF' : 'url(#logo-grad)'} 
      />

      {/* Curved Smiling Division Bar representing Splitting & Friendliness */}
      <path 
        d="M6 14 C 11 21.5, 21 21.5, 26 14" 
        stroke={isWhite ? '#FFFFFF' : 'url(#logo-grad)'} 
        strokeWidth="4" 
        strokeLinecap="round" 
      />

      {/* Bottom Dot representing Dudes/Friends */}
      <circle 
        cx="16" 
        cy="24.5" 
        r="4" 
        fill={isWhite ? '#FFFFFF' : 'url(#logo-grad)'} 
      />
    </svg>
  )
}
