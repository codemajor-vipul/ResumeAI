import axios from 'axios'
import type {
  User, Template, TemplatePreview, Resume, Section,
  AiRequest, AiQuota, ExportJob, JobMatch,
} from '../types'

// All traffic goes through the YARP gateway → vite proxy strips CORS
const http = axios.create({ baseURL: '/api' })

// Attach JWT from localStorage on every request
http.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (body: { fullName: string; email: string; password: string; phone?: string }) =>
    http.post<{ data: { token: string; user: User } }>('/auth/register', body).then(r => r.data.data),

  login: (body: { email: string; password: string }) =>
    http.post<{ data: { token: string; user: User } }>('/auth/login', body).then(r => r.data.data),

  profile: (): Promise<User> => http.get('/auth/profile').then(r => r.data.data),

  updateProfile: (body: { fullName: string; phone?: string }): Promise<User> =>
    http.put('/auth/profile', body).then(r => r.data.data),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    http.put('/auth/password', body),

  updateSubscription: (plan: 'FREE' | 'PREMIUM') =>
    http.put('/auth/subscription', { plan }),

  deactivate: () => http.delete('/auth/deactivate'),

  // Admin
  getAllUsers: (): Promise<User[]> => http.get('/auth/users').then(r => r.data.data),
  deleteUser: (id: number) => http.delete(`/auth/users/${id}`),
  suspendUser: (id: number) => http.put(`/auth/users/${id}/suspend`),
  reactivateUser: (id: number) => http.put(`/auth/users/${id}/reactivate`),

  // OAuth — browser redirect, not axios
  googleLogin:   () => { window.location.href = '/api/auth/oauth/google' },
  linkedInLogin: () => { window.location.href = '/api/auth/oauth/linkedin' },
}

// ─── Templates ────────────────────────────────────────────────────────────────
export const templateApi = {
  getAll:      (): Promise<Template[]> => http.get('/templates').then(r => r.data.data),
  getFree:     (): Promise<Template[]> => http.get('/templates/free').then(r => r.data.data),
  getPremium:  (): Promise<Template[]> => http.get('/templates/premium').then(r => r.data.data),
  getPopular:  (top = 8): Promise<Template[]> => http.get(`/templates/popular?top=${top}`).then(r => r.data.data),
  getByCategory: (cat: string): Promise<Template[]> => http.get(`/templates/category/${cat}`).then(r => r.data.data),
  getById:     (id: number): Promise<Template> => http.get(`/templates/${id}`).then(r => r.data.data),
  getPreview:  (id: number): Promise<TemplatePreview> => http.get(`/templates/${id}/preview`).then(r => r.data.data),
  incrementUsage: (id: number) => http.post(`/templates/${id}/increment-usage`),
}

// ─── Resume ───────────────────────────────────────────────────────────────────
export const resumeApi = {
  create: (body: { title: string; targetJobTitle: string; templateId: number; language?: string }): Promise<Resume> =>
    http.post('/resumes', body).then(r => r.data.data),

  getAll:    (): Promise<Resume[]> => http.get('/resumes/my').then(r => r.data.data),
  getById:   (id: number): Promise<Resume> => http.get(`/resumes/${id}`).then(r => r.data.data),
  getPublic: (): Promise<Resume[]> => http.get('/resumes/public').then(r => r.data.data),

  update: (id: number, body: Partial<Pick<Resume, 'title' | 'targetJobTitle' | 'language'>>): Promise<Resume> =>
    http.put(`/resumes/${id}`, body).then(r => r.data.data),

  duplicate: (id: number): Promise<Resume> =>
    http.post(`/resumes/${id}/duplicate`).then(r => r.data.data),

  publish:   (id: number): Promise<Resume> => http.put(`/resumes/${id}/publish`).then(r => r.data.data),
  unpublish: (id: number): Promise<Resume> => http.put(`/resumes/${id}/unpublish`).then(r => r.data.data),

  delete: (id: number) => http.delete(`/resumes/${id}`),
}

// ─── Sections ─────────────────────────────────────────────────────────────────
export const sectionApi = {
  add: (body: {
    resumeId: number; sectionType: string; title: string
    content: string; displayOrder: number
  }): Promise<Section> => http.post('/sections', body).then(r => r.data.data),

  getByResume: (resumeId: number): Promise<Section[]> =>
    http.get(`/sections/by-resume/${resumeId}`).then(r => r.data.data),

  update: (id: number, body: Partial<Pick<Section, 'title' | 'content' | 'isVisible'>>): Promise<Section> =>
    http.put(`/sections/${id}`, body).then(r => r.data.data),

  bulkUpdate: (sections: Array<{ sectionId: number; title: string; content: string; isVisible: boolean }>): Promise<Section[]> =>
    http.put('/sections/bulk-update', { sections }).then(r => r.data.data),

  reorder: (resumeId: number, orderedIds: number[]) =>
    http.put(`/sections/reorder/${resumeId}`, { orderedSectionIds: orderedIds }),

  toggleVisibility: (id: number): Promise<Section> =>
    http.put(`/sections/${id}/toggle-visibility`).then(r => r.data.data),

  markAiGenerated: (id: number) => http.patch(`/sections/${id}/ai-generated`),

  delete:    (id: number) => http.delete(`/sections/${id}`),
  deleteAll: (resumeId: number) => http.delete(`/sections/by-resume/${resumeId}`),
}

// ─── AI ───────────────────────────────────────────────────────────────────────
export const aiApi = {
  generateSummary: (body: {
    resumeId: number; jobTitle: string; yearsOfExperience: number; keySkills: string
  }): Promise<AiRequest> =>
    http.post('/ai/generate-summary', body).then(r => r.data.data),

  generateBullets: (body: {
    resumeId: number; jobTitle: string; companyName: string; responsibilities: string
  }): Promise<AiRequest> =>
    http.post('/ai/generate-bullets', body).then(r => r.data.data),

  generateCoverLetter: (body: {
    resumeId: number; jobDescription: string; companyName: string
  }): Promise<AiRequest> =>
    http.post('/ai/generate-cover-letter', body).then(r => r.data.data),

  improveSection: (body: {
    resumeId: number; sectionId: number; improvementGoal: string
  }): Promise<AiRequest> =>
    http.post('/ai/improve-section', body).then(r => r.data.data),

  checkAts: (body: {
    resumeId: number; jobDescription: string
  }): Promise<AiRequest> =>
    http.post('/ai/check-ats', body).then(r => r.data.data),

  suggestSkills: (body: {
    resumeId: number; targetJobTitle: string
  }): Promise<AiRequest> =>
    http.post('/ai/suggest-skills', body).then(r => r.data.data),

  tailorForJob: (body: {
    resumeId: number; jobTitle: string; jobDescription: string
  }): Promise<AiRequest> =>
    http.post('/ai/tailor-for-job', body).then(r => r.data.data),

  translate: (body: {
    resumeId: number; targetLanguage: string
  }): Promise<AiRequest> =>
    http.post('/ai/translate', body).then(r => r.data.data),

  analyzeJobFit: (body: {
    resumeId: number; jobDescription: string
  }): Promise<AiRequest> =>
    http.post('/ai/analyze-job-fit', body).then(r => r.data.data),

  getQuota:   (): Promise<AiQuota> => http.get('/ai/quota').then(r => r.data.data),
  getHistory: (): Promise<AiRequest[]> => http.get('/ai/history').then(r => r.data.data),
}

// ─── Export ───────────────────────────────────────────────────────────────────
export const exportApi = {
  exportPdf:    (resumeId: number): Promise<ExportJob> =>
    http.post('/exports/pdf', { resumeId, format: 'PDF' }).then(r => r.data.data),
  exportDocx:   (resumeId: number): Promise<ExportJob> =>
    http.post('/exports/docx', { resumeId, format: 'DOCX' }).then(r => r.data.data),
  exportJson:   (resumeId: number): Promise<ExportJob> =>
    http.post('/exports/json', { resumeId, format: 'JSON' }).then(r => r.data.data),
  getStatus:    (jobId: string): Promise<ExportJob> =>
    http.get(`/exports/${jobId}/status`).then(r => r.data.data),
  getMyExports: (): Promise<ExportJob[]> => http.get('/exports/my').then(r => r.data.data),
  getStats:     (): Promise<Record<string, number>> => http.get('/exports/stats').then(r => r.data.data),
  downloadUrl:  (jobId: string) => `/api/exports/${jobId}/download`,
  delete:       (jobId: string) => http.delete(`/exports/${jobId}`),
}

// ─── Job Match ────────────────────────────────────────────────────────────────
export const jobMatchApi = {
  analyze: (body: {
    resumeId: number; jobTitle: string; jobDescription: string
  }): Promise<JobMatch> =>
    http.post('/job-matches/analyze', body).then(r => r.data.data),

  getMyMatches:    (): Promise<JobMatch[]> => http.get('/job-matches/my').then(r => r.data.data),
  getByResume:     (resumeId: number): Promise<JobMatch[]> =>
    http.get(`/job-matches/by-resume/${resumeId}`).then(r => r.data.data),
  getById:         (id: number): Promise<JobMatch> =>
    http.get(`/job-matches/${id}`).then(r => r.data.data),
  getTop:          (minScore = 70): Promise<JobMatch[]> =>
    http.get(`/job-matches/top?minScore=${minScore}`).then(r => r.data.data),
  bookmark:        (matchId: number, bookmarked: boolean) =>
    http.post(`/job-matches/${matchId}/bookmark?bookmarked=${bookmarked}`),
  getRecommendations: (matchId: number): Promise<string> =>
    http.get(`/job-matches/${matchId}/recommendations`).then(r => r.data.data),
  delete:          (matchId: number) => http.delete(`/job-matches/${matchId}`),
}

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifApi = {
  getAll:      () => http.get('/notifications').then(r => r.data.data),
  unreadCount: (): Promise<number> => http.get('/notifications/unread-count').then(r => r.data.data),
  markRead:    (id: number) => http.put(`/notifications/${id}/read`),
  markAllRead: () => http.put('/notifications/read-all'),
  delete:      (id: number) => http.delete(`/notifications/${id}`),
}
