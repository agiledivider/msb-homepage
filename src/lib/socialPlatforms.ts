/**
 * Community channels an editor can link in the footer (Website-Einstellungen →
 * Footer → Community). Shared by the CMS select and the footer icons, so the two
 * can't drift apart. Order here is the order in the select.
 */
export const SOCIAL_PLATFORMS = [
  { value: 'discord', label: 'Discord' },
  { value: 'signal', label: 'Signal' },
  { value: 'matrix', label: 'Matrix' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'mastodon', label: 'Mastodon' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'github', label: 'GitHub' },
] as const

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]['value']

export const socialLabel = (p: SocialPlatform) => SOCIAL_PLATFORMS.find((x) => x.value === p)?.label ?? p
