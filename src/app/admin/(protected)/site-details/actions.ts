'use server'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { put } from '@vercel/blob'
import { verifyAdminSession } from '@/lib/adminAuth'
import { db } from '@/db/client'
import { siteConfig, works } from '@/db/schema'
import { siteConfigFormSchema } from '@/lib/siteConfigSchema'
import { MAX_UPLOAD_BYTES, workFormSchema } from '@/lib/workSchema'

export interface ActionState {
  error?: string
  success?: boolean
}

export async function saveSiteDetails(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await verifyAdminSession()

  const parsed = siteConfigFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }
  const data = parsed.data

  await db
    .update(siteConfig)
    .set({
      name: data.name,
      url: data.url,
      phone: data.phone,
      whatsappNumber: data.whatsappNumber,
      email: data.email,
      addressLines: data.addressLines,
      city: data.city,
      postalCode: data.postalCode,
      districts: data.districts,
      openingHours: data.openingHours,
      socialFacebook: data.facebook,
      socialInstagram: data.instagram,
      socialTiktok: data.tiktok,
      mapEmbedUrl: data.mapEmbedUrl,
      freeMeasurementVisit: data.freeMeasurementVisit,
      figuresYearsInBusiness: data.yearsInBusiness,
      figuresHomesFitted: data.homesFitted,
      figuresUnitsDelivered: data.unitsDelivered,
      figuresDistrictsCovered: data.districtsCovered,
      updatedAt: new Date(),
    })
    .where(eq(siteConfig.id, 1))

  revalidatePath('/')
  return { success: true }
}

function extensionFor(mimeType: string): string {
  const ext = mimeType.split('/')[1]
  return ext && /^[a-z0-9]+$/i.test(ext) ? ext : 'jpg'
}

export async function saveWork(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Missing work id.' }

  const parsed = workFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }
  const data = parsed.data

  let imageUrl: string | undefined
  const file = formData.get('image')
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith('image/')) {
      return { error: 'The uploaded file must be an image.' }
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return { error: 'Image is too large — 10MB maximum.' }
    }
    const blob = await put(`work/${id}-${Date.now()}.${extensionFor(file.type)}`, file, {
      access: 'public',
    })
    imageUrl = blob.url
  }

  await db
    .update(works)
    .set({
      ...(imageUrl ? { image: imageUrl } : {}),
      title: data.title,
      category: data.category,
      ratio: data.ratio,
      materials: data.materials,
      dimensions: data.dimensions,
      hardware: data.hardware,
      propertyType: data.propertyType,
      district: data.district,
      year: data.year,
      updatedAt: new Date(),
    })
    .where(eq(works.id, id))

  revalidatePath('/')
  return { success: true }
}
