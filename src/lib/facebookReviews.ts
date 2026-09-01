const GRAPH_API_VERSION = 'v21.0'
const RATINGS_FIELDS =
  'reviewer{name,picture},created_time,recommendation_type,review_text,open_graph_story'

export interface FacebookRatingItem {
  id?: string
  created_time?: string
  recommendation_type?: 'positive' | 'negative'
  review_text?: string
  reviewer?: { name?: string; picture?: { data?: { url?: string } } }
  open_graph_story?: { id?: string }
}

export interface MappedFacebookReview {
  fbReviewId: string
  authorName: string
  reviewText: string
  recommended: boolean | null
  reviewedAt: Date
  reviewUrl: string | null
  avatarUrl: string | null
}

/** Maps one raw Graph API ratings-edge item to a storable row. Returns null for
 *  items missing the id or review text a display card needs — FB lets a visitor
 *  leave just a thumbs up/down with no text, which isn't a testimonial. */
export function mapFacebookReview(raw: FacebookRatingItem): MappedFacebookReview | null {
  if (!raw.id) return null
  const reviewText = raw.review_text?.trim()
  if (!reviewText) return null

  return {
    fbReviewId: raw.id,
    authorName: raw.reviewer?.name?.trim() || 'Facebook user',
    reviewText,
    recommended:
      raw.recommendation_type === 'positive' ? true : raw.recommendation_type === 'negative' ? false : null,
    reviewedAt: raw.created_time ? new Date(raw.created_time) : new Date(),
    reviewUrl: raw.open_graph_story?.id ? `https://www.facebook.com/${raw.open_graph_story.id}` : null,
    avatarUrl: raw.reviewer?.picture?.data?.url ?? null,
  }
}

interface FacebookRatingsResponse {
  data?: FacebookRatingItem[]
  paging?: { next?: string }
  error?: { message?: string }
}

/** Fetches every review on a Page's ratings edge, following pagination. Throws with
 *  the Graph API's own error message on failure — that message is specific enough
 *  (expired token, missing permission, etc.) to show an admin directly. */
export async function fetchFacebookReviews({
  pageId,
  accessToken,
  fetchImpl = fetch,
}: {
  pageId: string
  accessToken: string
  fetchImpl?: typeof fetch
}): Promise<FacebookRatingItem[]> {
  const items: FacebookRatingItem[] = []
  let url: string =
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/ratings` +
    `?fields=${RATINGS_FIELDS}&access_token=${accessToken}`

  while (url) {
    const res = await fetchImpl(url)
    const body = (await res.json()) as FacebookRatingsResponse
    if (body.error) {
      throw new Error(body.error.message ?? 'Facebook API returned an error.')
    }
    items.push(...(body.data ?? []))
    if (!body.paging?.next) break
    url = body.paging.next
  }

  return items
}
