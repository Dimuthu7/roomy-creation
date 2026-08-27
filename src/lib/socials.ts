import { isTBC, type Maybe } from './tbc'

export interface SocialLink {
  label: string
  href: string
}

export interface SocialHandles {
  facebook: Maybe<string>
  instagram: Maybe<string>
  tiktok: Maybe<string>
}

const SOCIAL_LABELS: Record<keyof SocialHandles, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
}

/** Shared by Footer and Nav so a still-[TBC] handle never renders a dead icon in either. */
export function getActiveSocials(social: SocialHandles): SocialLink[] {
  return (Object.keys(SOCIAL_LABELS) as Array<keyof SocialHandles>)
    .map((key) => ({ label: SOCIAL_LABELS[key], href: social[key] }))
    .filter((s): s is SocialLink => !isTBC(s.href))
}
