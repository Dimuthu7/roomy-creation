import { isTBC, joinDefined } from './tbc'
import type { Work } from '@/data/works'

const ARTICLE: Record<string, string> = {
  house: 'a house',
  apartment: 'an apartment',
  hotel: 'a hotel',
  office: 'an office',
}

export function workAlt(work: Work): string {
  const context = joinDefined(
    [
      isTBC(work.materials) ? work.materials : `in ${work.materials}`,
      isTBC(work.propertyType) ? work.propertyType : `in ${ARTICLE[work.propertyType]}`,
      work.district,
    ],
    ', ',
  )
  // District reads as a trailing appositive ("..., Colombo, by Roomy Creations"),
  // so it gets a comma before "by" that the other context clauses don't.
  const trailingComma = !isTBC(work.district) ? ',' : ''
  return context
    ? `${work.title} ${context}${trailingComma} by Roomy Creations`
    : `${work.title} by Roomy Creations`
}
