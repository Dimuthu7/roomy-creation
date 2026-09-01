import { describe, it, expect, vi, afterEach } from 'vitest'
import { mapFacebookReview, fetchFacebookReviews } from './facebookReviews'

describe('mapFacebookReview', () => {
  it('maps a full review: recommendation, author, text, date, and a review URL', () => {
    const result = mapFacebookReview({
      id: 'page_user',
      created_time: '2026-01-15T10:00:00+0000',
      recommendation_type: 'positive',
      review_text: 'Amazing work on our wardrobe.',
      reviewer: { name: 'Nimal Perera' },
      open_graph_story: { id: '999888777' },
    })
    expect(result).toEqual({
      fbReviewId: 'page_user',
      authorName: 'Nimal Perera',
      reviewText: 'Amazing work on our wardrobe.',
      recommended: true,
      reviewedAt: new Date('2026-01-15T10:00:00+0000'),
      reviewUrl: 'https://www.facebook.com/999888777',
      avatarUrl: null,
    })
  })

  it('maps a negative recommendation to recommended: false', () => {
    const result = mapFacebookReview({
      id: 'page_user2',
      created_time: '2026-01-15T10:00:00+0000',
      recommendation_type: 'negative',
      review_text: 'Not what we expected.',
      reviewer: { name: 'Someone' },
    })
    expect(result?.recommended).toBe(false)
  })

  it('maps a missing recommendation_type to recommended: null', () => {
    const result = mapFacebookReview({
      id: 'page_user3',
      created_time: '2026-01-15T10:00:00+0000',
      review_text: 'Just a comment, no thumbs up or down.',
      reviewer: { name: 'Someone' },
    })
    expect(result?.recommended).toBeNull()
  })

  it('defaults the author name to "Facebook user" when the reviewer name is missing', () => {
    const result = mapFacebookReview({
      id: 'page_user4',
      created_time: '2026-01-15T10:00:00+0000',
      review_text: 'Great job.',
    })
    expect(result?.authorName).toBe('Facebook user')
  })

  it('returns null (skips) when review_text is missing', () => {
    const result = mapFacebookReview({
      id: 'page_user5',
      created_time: '2026-01-15T10:00:00+0000',
      recommendation_type: 'positive',
      reviewer: { name: 'Someone' },
    })
    expect(result).toBeNull()
  })

  it('returns null (skips) when review_text is blank', () => {
    const result = mapFacebookReview({
      id: 'page_user6',
      created_time: '2026-01-15T10:00:00+0000',
      review_text: '   ',
    })
    expect(result).toBeNull()
  })

  it('returns null (skips) when id is missing', () => {
    const result = mapFacebookReview({
      created_time: '2026-01-15T10:00:00+0000',
      review_text: 'Great job.',
    })
    expect(result).toBeNull()
  })

  it('leaves reviewUrl null when there is no open_graph_story', () => {
    const result = mapFacebookReview({
      id: 'page_user7',
      created_time: '2026-01-15T10:00:00+0000',
      review_text: 'Great job.',
    })
    expect(result?.reviewUrl).toBeNull()
  })

  it("maps the reviewer's profile picture URL into avatarUrl", () => {
    const result = mapFacebookReview({
      id: 'page_user8',
      created_time: '2026-01-15T10:00:00+0000',
      review_text: 'Great job.',
      reviewer: { name: 'Someone', picture: { data: { url: 'https://scontent.example/pic.jpg' } } },
    })
    expect(result?.avatarUrl).toBe('https://scontent.example/pic.jpg')
  })

  it('leaves avatarUrl null when the reviewer has no picture data', () => {
    const result = mapFacebookReview({
      id: 'page_user9',
      created_time: '2026-01-15T10:00:00+0000',
      review_text: 'Great job.',
      reviewer: { name: 'Someone' },
    })
    expect(result?.avatarUrl).toBeNull()
  })
})

describe('fetchFacebookReviews', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requests the ratings edge for the given page with the access token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    })
    await fetchFacebookReviews({ pageId: '12345', accessToken: 'tok', fetchImpl })
    expect(fetchImpl).toHaveBeenCalledOnce()
    const url = String(fetchImpl.mock.calls[0][0])
    expect(url).toContain('/12345/ratings')
    expect(url).toContain('access_token=tok')
  })

  it('returns the items from the response data array', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'a' }, { id: 'b' }] }),
    })
    const result = await fetchFacebookReviews({ pageId: '12345', accessToken: 'tok', fetchImpl })
    expect(result).toEqual([{ id: 'a' }, { id: 'b' }])
  })

  it('follows pagination via paging.next until it runs out', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'a' }], paging: { next: 'https://graph.facebook.com/next-page' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'b' }] }),
      })
    const result = await fetchFacebookReviews({ pageId: '12345', accessToken: 'tok', fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls[1][0]).toBe('https://graph.facebook.com/next-page')
    expect(result).toEqual([{ id: 'a' }, { id: 'b' }])
  })

  it('throws a descriptive error when the Graph API returns an error payload', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Invalid OAuth access token.' } }),
    })
    await expect(fetchFacebookReviews({ pageId: '12345', accessToken: 'bad', fetchImpl })).rejects.toThrow(
      'Invalid OAuth access token.',
    )
  })
})
