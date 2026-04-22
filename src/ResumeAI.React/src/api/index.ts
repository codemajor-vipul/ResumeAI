import axios from 'axios'

// All traffic goes through the YARP gateway → vite proxy strips CORS
const http = axios.create({ baseURL: '/api' })

// Attach JWT from localStorage on every request
http.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// ─── Auth ────────────────────────────────────────────────────────
export const authApi = {
  register: (body: { fullName: string; email: string; password: string; phone?: string }) =>
    http.post('/auth/register', body).then(r => r.data.data),

  login: (body: { email: string; password: string }) =>
    http.post('/auth/login', body).then(r => r.data.data),

  profile: () => http.get('/auth/profile').then(r => r.data.data),

  updateProfile: (body: { fullName: string; phone?: string }) =>
    http.put('/auth/profile', body).then(r => r.data.data),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    http.put('/auth/password', body),

  updateSubscription: (plan: 'FREE' | 'PREMIUM') =>
    http.put('/auth/subscription', { plan }),

  deactivate: () => http.delete('/auth/deactivate'),

  // OAuth — browser redirect, not axios
  googleLogin: () => { window.location.href = '/api/auth/oauth/google' },
  linkedInLogin: () => { window.location.href = '/api/auth/oauth/linkedin' },
}

// ─── Templates ───────────────────────────────────────────────────
export const templateApi = {
  getAll:    () => http.get('/templates').then(r => r.data.data),
  getFree:   () => http.get('/templates/free').then(r => r.data.data),
  getPopular:(top = 5) => http.get(`/templates/popular?top=${top}`).then(r => r.data.data),
  getById:   (id: number) => http.get(`/templates/${id}`).then(r => r.data.data),
}

// ─── Resume ──────────────────────────────────────────────────────
export const resumeApi = {
  create: (body: { title: string; targetJobTitle: string; templateId: number; language?: string }) =>
    http.post('/resumes', body).then(r => r.data.data),

  getAll: () => http.get('/resumes/my').then(r => r.data.data),

  getById: (id: number) => http.get(`/resumes/${id}`).then(r => r.data.data),

  update: (id: number, body: object) =>
    http.put(`/resumes/${id}`, body).then(r => r.data.data),

  delete: (id: number) => http.delete(`/resumes/${id}`),

  updateAtsScore: (id: number, score: number) =>
    http.put(`/resumes/${id}/ats-score`, { score }),
}

// ─── Sections ────────────────────────────────────────────────────
export const sectionApi = {
  add: (body: { resumeId: number; sectionType: string; title: string; content: string; displayOrder: number }) =>
    http.post('/sections', body).then(r => r.data.data),

  getByResume: (resumeId: number) =>
    http.get(`/sections/by-resume/${resumeId}`).then(r => r.data.data),

  update: (id: number, body: { title: string; content: string; isVisible: boolean }) =>
    http.put(`/sections/${id}`, body).then(r => r.data.data),

  delete: (id: number) => http.delete(`/sections/${id}`),

  reorder: (resumeId: number, orderedIds: number[]) =>
    http.put(`/sections/reorder/${resumeId}`, { orderedSectionIds: orderedIds }),
}

// ─── AI ──────────────────────────────────────────────────────────
export const aiApi = {
  generateSummary: (body: { resumeId: number; jobTitle: string; yearsOfExperience: number; keySkills: string }) =>
    http.post('/ai/generate-summary', body).then(r => r.data.data),

  generateBullets: (body: { resumeId: number; jobTitle: string; companyName: string; responsibilities: string }) =>
    http.post('/ai/generate-bullets', body).then(r => r.data.data),

  checkAts: (body: { resumeId: number; jobDescription: string }) =>
    http.post('/ai/check-ats', body).then(r => r.data.data),

  suggestSkills: (body: { resumeId: number; targetJobTitle: string }) =>
    http.post('/ai/suggest-skills', body).then(r => r.data.data),

  generateCoverLetter: (body: { resumeId: number; jobDescription: string; companyName: string }) =>
    http.post('/ai/generate-cover-letter', body).then(r => r.data.data),

  getQuota: () => http.get('/ai/quota').then(r => r.data.data),

  getHistory: () => http.get('/ai/history').then(r => r.data.data),
}

// ─── Export ──────────────────────────────────────────────────────
export const exportApi = {
  exportPdf:  (resumeId: number) => http.post('/exports/pdf', { resumeId, format: 'PDF' }).then(r => r.data.data),
  exportDocx: (resumeId: number) => http.post('/exports/docx', { resumeId, format: 'DOCX' }).then(r => r.data.data),
  getStatus:  (jobId: string) => http.get(`/exports/${jobId}/status`).then(r => r.data.data),
  getMyExports: () => http.get('/exports/my').then(r => r.data.data),
}

// ─── Job Match ───────────────────────────────────────────────────
export const jobMatchApi = {
  analyze: (body: { resumeId: number; jobTitle: string; jobDescription: string }) =>
    http.post('/job-matches/analyze', body).then(r => r.data.data),

  getByResume: (resumeId: number) =>
    http.get(`/job-matches/by-resume/${resumeId}`).then(r => r.data.data),

  getTop: (minScore = 70) =>
    http.get(`/job-matches/top?minScore=${minScore}`).then(r => r.data.data),

  bookmark: (matchId: number, bookmarked: boolean) =>
    http.post(`/job-matches/${matchId}/bookmark?bookmarked=${bookmarked}`),
}

// ─── Notifications ───────────────────────────────────────────────
export const notifApi = {
  getAll:      () => http.get('/notifications').then(r => r.data.data),
  unreadCount: () => http.get('/notifications/unread-count').then(r => r.data.data),
  markRead:    (id: number) => http.put(`/notifications/${id}/read`),
  markAllRead: () => http.put('/notifications/read-all'),
  delete:      (id: number) => http.delete(`/notifications/${id}`),
}
