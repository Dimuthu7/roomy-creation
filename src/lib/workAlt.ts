import { isTBC, joinDefined } from './tbc'
import type { PropertyType, Work } from '@/data/works'

const ARTICLE: Record<PropertyType, string> = {
  house: 'a house',
  apartment: 'an apartment',
  hotel: 'a hotel',
  office: 'an office',
}

export function workAlt(work: Work): string {
  const place = joinDefined(
    [
      isTBC(work.propertyType) ? work.propertyType : `in ${ARTICLE[work.propertyType]}`,
      isTBC(work.district) ? work.district : `in ${work.district}`,
    ],
    ' ',
  )
  const spec = isTBC(work.materials) ? '' : `, ${work.materials},`

  return `${work.title}${place ? ` ${place}` : ''}${spec} by Roomy Creations`
}
