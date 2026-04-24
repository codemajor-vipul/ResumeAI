// ─── Domain Types ─────────────────────────────────────────────────────────────
// Single source of truth for every shape the backend returns.

export interface User {
  userId: number
  fullName: string
  email: string
  phone?: string
  subscriptionPlan: 'FREE' | 'PREMIUM'
  role: 'USER' | 'ADMIN'
}

export interface Template {
  templateId: number
  name: string
  description: string
  category: string
  isPremium: boolean
  isActive: boolean
  usageCount: number
  htmlLayout?: string
  cssStyles?: string
}

export interface TemplatePreview {
  templateId: number
  name: string
  htmlLayout: string
  cssStyles: string
}

export interface Resume {
  resumeId: number
  userId: number
  title: string
  targetJobTitle: string
  templateId: number
  atsScore: number
  isPublic: boolean
  viewCount: number
  language: string
  createdAt: string
  updatedAt: string
}

export interface Section {
  sectionId: number
  resumeId: number
  sectionType: string
  title: string
  content: string
  displayOrder: number
  isVisible: boolean
  isAiGenerated: boolean
}

export interface AiRequest {
  requestId: number
  requestType: string
  model: string
  tokensUsed: number
  status: string
  aiResponse: string
  createdAt: string
}

export interface AiQuota {
  remainingContentCalls: number
  maxContentCalls: number
  remainingAtsCalls: number
  maxAtsCalls: number
}

export interface ExportJob {
  jobId: string
  resumeId: number
  format: 'PDF' | 'DOCX' | 'JSON'
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  fileUrl?: string
  errorMessage?: string
  createdAt: string
}

export interface JobMatch {
  matchId: number
  resumeId: number
  jobTitle: string
  jobDescription: string
  matchScore: number
  missingSkills?: string
  recommendations?: string
  isBookmarked: boolean
  source: string
  createdAt: string
}

export type SectionType =
  | 'SUMMARY' | 'EXPERIENCE' | 'EDUCATION' | 'SKILLS'
  | 'CERTIFICATIONS' | 'PROJECTS' | 'LANGUAGES' | 'CUSTOM'

export type TemplateCategory =
  | 'PROFESSIONAL' | 'CREATIVE' | 'MODERN' | 'TECHNICAL' | 'ACADEMIC' | 'MINIMAL'
