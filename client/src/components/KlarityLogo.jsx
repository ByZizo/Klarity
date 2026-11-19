import React from 'react';

/**
 * KlarityLogo - Bank architecture with the letter "K" integrated as the central structural pillar.
 * Features:
 * - Classical triangular temple pediment / roof
 * - Entablature (upper support beam)
 * - The letter "K" as the structural support (vertical column stem + angled diagonal buttress pillars)
 * - Classical double-step temple foundation / base
 */
export default function KlarityLogo({ className = 'w-7 h-7 text-[#18457c]', ...props }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Klarity Logo"
      {...props}
    >
      {/* Triangular Roof Pediment */}
      <path d="M24 5.5L42.5 15H5.5L24 5.5Z" />

      {/* Entablature (Roof Header Beam) */}
      <rect x="6.5" y="16.5" width="35" height="3" rx="1" />

      {/* The Central "K" Structure */}
      {/* Left Vertical Column of the K */}
      <rect x="11" y="21" width="5.5" height="16.5" rx="0.75" />

      {/* Upper & Lower Diagonal Pillars of the K */}
      <path
        d="M16.5 28.2L28.8 21H34.8L21.2 29L35.2 37.5H29.2L16.5 29.8V28.2Z"
      />

      {/* Upper Temple Step */}
      <rect x="6.5" y="39" width="35" height="3" rx="1" />

      {/* Foundation Step (Wider) */}
      <rect x="3.5" y="43" width="41" height="3" rx="1" />
    </svg>
  );
}
