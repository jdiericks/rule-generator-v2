'use client'
import { Project, RuleSection, RuleTemplate, SectionType } from './types'

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const ct = res.headers.get('content-type') ?? ''
  const body = ct.includes('application/json') ? await res.json() : await res.text()
  if (!res.ok) {
    const msg = typeof body === 'string' ? body : body?.error ?? `Request failed (${res.status})`
    throw new Error(msg)
  }
  return body as T
}

// --- Anthropic API key (now server-side per user) ---
export interface ApiKeyStatus { hasKey: boolean; hint: string | null }

export async function getApiKeyStatus(): Promise<ApiKeyStatus> {
  return http<ApiKeyStatus>('/api/settings/api-key')
}

export async function saveApiKey(apiKey: string): Promise<{ ok: true; hint: string }> {
  return http('/api/settings/api-key', {
    method: 'PUT',
    body: JSON.stringify({ apiKey }),
  })
}

export async function clearApiKey(): Promise<void> {
  await http('/api/settings/api-key', { method: 'DELETE' })
}

// --- Projects ---
export async function loadProjects(): Promise<Project[]> {
  const data = await http<{ projects: Project[] }>('/api/projects')
  return data.projects
}

export async function createProject(input: {
  name: string
  description: string
  techStack: string[]
}): Promise<Project> {
  const data = await http<{ project: Project }>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return { ...data.project, sections: data.project.sections ?? [] }
}

export async function updateProject(
  id: string,
  updates: Partial<Pick<Project, 'name' | 'description' | 'techStack'>>
): Promise<Project | null> {
  const data = await http<{ project: Project }>(`/api/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
  return data.project
}

export async function deleteProject(id: string): Promise<void> {
  await http(`/api/projects/${id}`, { method: 'DELETE' })
}

export async function getProject(id: string): Promise<Project | null> {
  try {
    const data = await http<{ project: Project }>(`/api/projects/${id}`)
    return data.project
  } catch {
    return null
  }
}

// --- Sections ---
export async function addSection(
  projectId: string,
  data: Omit<RuleSection, 'id' | 'generatedContent' | 'filename'>
): Promise<RuleSection | null> {
  const res = await http<{ section: RuleSection }>(
    `/api/projects/${projectId}/sections`,
    {
      method: 'POST',
      body: JSON.stringify({ section: data }),
    }
  )
  return res.section
}

export async function updateSection(
  projectId: string,
  sectionId: string,
  updates: Partial<RuleSection>
): Promise<boolean> {
  await http(`/api/projects/${projectId}/sections/${sectionId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
  return true
}

export async function deleteSection(projectId: string, sectionId: string): Promise<boolean> {
  await http(`/api/projects/${projectId}/sections/${sectionId}`, { method: 'DELETE' })
  return true
}

export async function applyTemplateSections(
  projectId: string,
  sections: Omit<RuleSection, 'id' | 'generatedContent' | 'filename'>[],
  techTags: string[]
): Promise<boolean> {
  await http(`/api/projects/${projectId}/sections`, {
    method: 'POST',
    body: JSON.stringify({ sections, techStack: techTags }),
  })
  return true
}

// --- GitHub ---
export interface GithubStatus {
  connected: boolean
  login?: string
  avatarUrl?: string
  htmlUrl?: string
  name?: string | null
}
export interface GithubRepo {
  id: number
  owner: string
  name: string
  fullName: string
  defaultBranch: string
  private: boolean
  htmlUrl: string
  permissions?: { admin?: boolean; push?: boolean; pull?: boolean }
}
export interface ProjectGithubLink {
  owner: string
  repo: string
  branch: string
  rulesPath: string
  defaultBranch: string | null
  lastPushedSha: string | null
  lastPushedAt: string | null
}

export async function getGithubStatus(): Promise<GithubStatus> {
  return http('/api/github/status')
}
export async function listGithubRepos(): Promise<GithubRepo[]> {
  const data = await http<{ repos: GithubRepo[] }>('/api/github/repos')
  return data.repos
}
export async function getProjectGithubLink(projectId: string): Promise<ProjectGithubLink | null> {
  const data = await http<{ link: ProjectGithubLink | null }>(
    `/api/projects/${projectId}/github`
  )
  return data.link
}
export async function linkProjectToRepo(
  projectId: string,
  input: { owner: string; repo: string; branch?: string; rulesPath?: string; defaultBranch?: string }
): Promise<ProjectGithubLink> {
  const data = await http<{ link: ProjectGithubLink }>(`/api/projects/${projectId}/github`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
  return data.link
}
export async function unlinkProjectRepo(projectId: string): Promise<void> {
  await http(`/api/projects/${projectId}/github`, { method: 'DELETE' })
}
export interface PushResult {
  ok: true
  commitSha: string
  commitUrl: string
  branch: string
  filesWritten: string[]
}
export async function pushProjectRules(
  projectId: string,
  input: { commitMessage?: string; branch?: string } = {}
): Promise<PushResult> {
  return http(`/api/projects/${projectId}/github/push`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

// --- Templates (system + user-managed) ---

export async function listTemplates(): Promise<RuleTemplate[]> {
  const data = await http<{ templates: RuleTemplate[] }>('/api/templates')
  return data.templates
}

export interface TemplateInput {
  name: string
  description?: string
  category?: string
  techTags?: string[]
  sections?: Array<{
    name: string
    type: SectionType
    globs: string
    alwaysApply: boolean
    description: string
    requirements: string
    order: number
  }>
}

export async function createTemplate(input: TemplateInput): Promise<RuleTemplate> {
  const data = await http<{ template: RuleTemplate }>('/api/templates', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.template
}

export async function updateTemplate(id: string, input: Partial<TemplateInput>): Promise<RuleTemplate> {
  const data = await http<{ template: RuleTemplate }>(`/api/templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return data.template
}

export async function deleteTemplate(id: string): Promise<void> {
  await http(`/api/templates/${id}`, { method: 'DELETE' })
}
