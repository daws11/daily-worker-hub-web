/**
 * Social media content formatting utilities for job posts.
 * Provides platform-specific formatting for Instagram, Facebook, and other social platforms.
 */

export interface SocialContentInput {
  title: string
  description: string
  budget_min: number
  budget_max?: number
  deadline?: string
  address?: string
  business_name?: string
  category?: string
  requirements?: string
  application_url?: string
}

export interface FormattedSocialContent {
  text: string
  hashtags: string[]
  callToAction: string
  characterCount: number
  withinLimit: boolean
}

/**
 * Format job content for Instagram post.
 * Instagram caption limit: 2,200 characters
 */
export function formatForInstagram(
  input: SocialContentInput
): FormattedSocialContent {
  const { title, description, budget_min, budget_max, deadline, address, business_name } =
    input

  const budget = formatBudget(budget_min, budget_max)
  const location = address ? truncateText(address, 30) : ''
  const deadlineText = deadline ? formatDate(deadline) : ''

  const hashtags = [
    '#lowongankerja',
    '#karir',
    '#loker',
    '#jobhunt',
    '#kerja',
    '#recruitment',
  ]

  // Build caption sections
  const sections: string[] = []

  // Title with emoji
  sections.push(`✨ ${title.toUpperCase()}`)

  // Business name if available
  if (business_name) {
    sections.push(`🏢 ${business_name}`)
  }

  // Description (truncated for Instagram)
  const desc = truncateText(description, 300)
  sections.push(`\n${desc}`)

  // Job details
  const details: string[] = []
  details.push(`💰 Gaji: ${budget}`)
  if (location) {
    details.push(`📍 Lokasi: ${location}`)
  }
  if (deadlineText) {
    details.push(`⏰ Deadline: ${deadlineText}`)
  }
  sections.push(`\n${details.join('\n')}`)

  // Call to action
  const callToAction = '📩 Apply now via link in bio!'

  // Hashtags (30 max for Instagram)
  const hashtagSection = hashtags.slice(0, 30).join(' ')

  // Combine all sections
  let fullText = sections.join('\n')
  fullText += `\n\n${callToAction}`
  fullText += `\n\n${hashtagSection}`

  // Check character limit (2,200 for Instagram)
  const characterCount = fullText.length
  const withinLimit = characterCount <= 2200

  // Truncate if over limit
  let finalText = fullText
  if (!withinLimit) {
    // Remove description first if too long
    const overLimit = characterCount - 2200
    const descLength = desc.length
    if (descLength > overLimit) {
      finalText = fullText.replace(desc, truncateText(description, descLength - overLimit - 10))
    }
  }

  return {
    text: finalText,
    hashtags,
    callToAction,
    characterCount: finalText.length,
    withinLimit: finalText.length <= 2200,
  }
}

/**
 * Format job content for Facebook post.
 * Facebook post limit: 63,206 characters
 */
export function formatForFacebook(
  input: SocialContentInput
): FormattedSocialContent {
  const {
    title,
    description,
    budget_min,
    budget_max,
    deadline,
    address,
    business_name,
    requirements,
    application_url,
  } = input

  const budget = formatBudget(budget_min, budget_max)
  const location = address || 'Remote'
  const deadlineText = deadline ? formatDate(deadline) : 'Open until filled'

  const hashtags = [
    '#lowongankerja',
    '#karir',
    '#loker',
    '#jobhunt',
    '#kerja',
    '#recruitment',
    '#vacancy',
    '#career',
  ]

  // Build post sections
  const sections: string[] = []

  // Header with emojis
  sections.push(`🔥 ${title.toUpperCase()} 🔥`)
  sections.push('━'.repeat(30))

  // Business name
  if (business_name) {
    sections.push(`\n🏢 ${business_name}`)
  }

  // Description
  sections.push(`\n📋 Deskripsi Pekerjaan:`)
  sections.push(description)

  // Requirements if available
  if (requirements) {
    sections.push(`\n✅ Persyaratan:`)
    sections.push(requirements)
  }

  // Job details
  sections.push(`\n💰 Gaji: ${budget}`)
  sections.push(`📍 Lokasi: ${location}`)
  sections.push(`⏰ Deadline: ${deadlineText}`)

  // Call to action
  let callToAction = '📩 Interested? Apply now!'
  if (application_url) {
    callToAction = `📩 Apply here: ${application_url}`
  }
  sections.push(`\n${callToAction}`)

  // Hashtags
  const hashtagSection = hashtags.join(' ')
  sections.push(`\n\n${hashtagSection}`)

  // Combine all sections
  const fullText = sections.join('\n')

  // Check character limit (63,206 for Facebook)
  const characterCount = fullText.length
  const withinLimit = characterCount <= 63206

  return {
    text: fullText,
    hashtags,
    callToAction,
    characterCount,
    withinLimit,
  }
}

/**
 * Format job content for LinkedIn post.
 * LinkedIn post limit: 3,000 characters
 */
export function formatForLinkedIn(
  input: SocialContentInput
): FormattedSocialContent {
  const { title, description, budget_min, budget_max, deadline, address, business_name } =
    input

  const budget = formatBudget(budget_min, budget_max)
  const location = address || 'Remote'
  const deadlineText = deadline ? formatDate(deadline) : 'Open until filled'

  const hashtags = [
    '#hiring',
    '#jobopening',
    '#recruitment',
    '#careers',
    '#jobsearch',
    '#vacancy',
  ]

  // Build post sections
  const sections: string[] = []

  // Professional header
  sections.push(`🚀 ${title}`)
  sections.push('')

  // Business name
  if (business_name) {
    sections.push(`${business_name} is hiring!`)
    sections.push('')
  }

  // Description
  sections.push('About the role:')
  sections.push(description)
  sections.push('')

  // Job details
  sections.push('Details:')
  sections.push(`• Compensation: ${budget}`)
  sections.push(`• Location: ${location}`)
  if (deadline !== undefined) {
    sections.push(`• Apply by: ${deadlineText}`)
  }

  // Call to action
  const callToAction = 'Interested? Apply via the link below!'
  sections.push('')
  sections.push(callToAction)

  // Hashtags (LinkedIn recommends 3-5 hashtags)
  sections.push('')
  sections.push(hashtags.slice(0, 5).join(' '))

  // Combine all sections
  const fullText = sections.join('\n')

  // Check character limit (3,000 for LinkedIn)
  const characterCount = fullText.length
  const withinLimit = characterCount <= 3000

  return {
    text: fullText,
    hashtags: hashtags.slice(0, 5),
    callToAction,
    characterCount,
    withinLimit,
  }
}

/**
 * Format job content for Twitter/X post.
 * Twitter post limit: 280 characters (premium users get more)
 */
export function formatForTwitter(
  input: SocialContentInput
): FormattedSocialContent {
  const { title, description, budget_min, budget_max, application_url } = input

  const budget = formatBudget(budget_min, budget_max)

  const hashtags = ['#hiring', '#job', '🔥']

  // Build tweet - very concise
  let tweet = `${title}\n${budget}\n`

  // Add description if space allows
  const remainingSpace = 280 - tweet.length - hashtags.join(' ').length - 10
  if (remainingSpace > 50 && description) {
    tweet += `${truncateText(description, remainingSpace)}\n`
  }

  // Add hashtags
  tweet += hashtags.join(' ')

  // Character count
  const characterCount = tweet.length
  const withinLimit = characterCount <= 280

  return {
    text: tweet,
    hashtags,
    callToAction: 'Apply now!',
    characterCount,
    withinLimit,
  }
}

// Helper functions

/**
 * Format budget range for display.
 */
function formatBudget(min: number, max?: number): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (max && max > min) {
    return `${formatCurrency(min)} - ${formatCurrency(max)}`
  }
  return formatCurrency(min)
}

/**
 * Format date for social media display.
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return 'Closed'
  } else if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Tomorrow'
  } else if (diffDays <= 7) {
    return `In ${diffDays} days`
  } else {
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }
}

/**
 * Truncate text to max length with ellipsis.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.slice(0, maxLength - 3).trim() + '...'
}

/**
 * Get platform-specific character limit.
 */
export function getPlatformCharacterLimit(platform: 'instagram' | 'facebook' | 'linkedin' | 'twitter'): number {
  const limits = {
    instagram: 2200,
    facebook: 63206,
    linkedin: 3000,
    twitter: 280,
  }
  return limits[platform]
}

/**
 * Validate content is within platform limit.
 */
export function validatePlatformContent(
  content: string,
  platform: 'instagram' | 'facebook' | 'linkedin' | 'twitter'
): { valid: boolean; characterCount: number; limit: number } {
  const limit = getPlatformCharacterLimit(platform)
  const characterCount = content.length
  return {
    valid: characterCount <= limit,
    characterCount,
    limit,
  }
}
