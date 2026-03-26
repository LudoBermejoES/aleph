export interface CampaignTheme {
  id: string
  name: string
  colors: {
    background: string
    primary: string
    accent: string
  }
}

export const CAMPAIGN_THEMES: CampaignTheme[] = [
  { id: 'default', name: 'Default', colors: { background: '#ffffff', primary: '#1a1a2e', accent: '#f4f4f5' } },
  { id: 'dark-fantasy', name: 'Dark Fantasy', colors: { background: '#160f0b', primary: '#8b1a1a', accent: '#c4a882' } },
  { id: 'cyberpunk', name: 'Cyberpunk', colors: { background: '#090d17', primary: '#00ffff', accent: '#ff00ff' } },
  { id: 'cosmic-horror', name: 'Cosmic Horror', colors: { background: '#0a0610', primary: '#3d7a3d', accent: '#2d1b4e' } },
  { id: 'high-fantasy', name: 'High Fantasy', colors: { background: '#f7f0e6', primary: '#1e3a6e', accent: '#d4a017' } },
  { id: 'western', name: 'Western', colors: { background: '#e8d5b0', primary: '#8b3a1a', accent: '#5c3317' } },
  { id: 'steampunk', name: 'Steampunk', colors: { background: '#1e160e', primary: '#d4823a', accent: '#a0522d' } },
  { id: 'eldritch', name: 'Eldritch', colors: { background: '#091514', primary: '#c8b84a', accent: '#1a3535' } },
  { id: 'fey-wilds', name: 'Fey Wilds', colors: { background: '#f0e8f8', primary: '#c0438a', accent: '#3d9e5a' } },
  { id: 'undead', name: 'Undead', colors: { background: '#080b10', primary: '#4a7a4a', accent: '#2a2f3a' } },
  { id: 'superhero', name: 'Superhero', colors: { background: '#080f24', primary: '#ffd700', accent: '#cc2200' } },
]
