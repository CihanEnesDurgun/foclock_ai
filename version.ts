/**
 * Central version information for FoClock AI
 * Update this file to change version numbers across the entire application
 */

export const VERSION = {
  // Main version number (matches package.json)
  major: 1,
  minor: 5,
  patch: 'B', // Can be number or string (e.g., 0, 'B', 'RC1')
  
  // Version strings for different contexts
  get full(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  },
  
  get short(): string {
    return `${this.major}.${this.minor}`;
  },
  
  // Display formats
  get neuralLink(): string {
    return `Neural Link v${this.short} Beta`;
  },
  
  get betaLabel(): string {
    return `Beta v${this.short}`;
  },
  
  get watermark(): string {
    return `FUFIT NEURAL ENGINE v${this.full}`;
  },
  
  get settingsDisplay(): string {
    return `FoClock AI Neural Beta ${this.short}`;
  },
  
  get settingsDisplayTR(): string {
    return `Sürüm: FoClock AI Neural Beta ${this.short}`;
  }
};
