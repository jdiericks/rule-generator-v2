'use client'
import { Project, RuleSection } from './types'

const PROJECTS_KEY = 'crb_projects'
const API_KEY_KEY = 'crb_api_key'

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// --- API Key ---
export function getApiKey(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(API_KEY_KEY) ?? ''
}
export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_KEY, key)
}

// --- Projects ---
export function loadProjects(): Project[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PROJECTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveProjects(projects: Project[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
}

export function createProject(data: { name: string; description: string; techStack: string[] }): Project {
  const project: Project = {
    id: uid(),
    name: data.name,
    description: data.description,
    techStack: data.techStack,
    sections: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const projects = loadProjects()
  saveProjects([project, ...projects])
  return project
}

export function updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'sections' | 'createdAt'>>): Project | null {
  const projects = loadProjects()
  const idx = projects.findIndex(p => p.id === id)
  if (idx === -1) return null
  projects[idx] = { ...projects[idx], ...updates, updatedAt: new Date().toISOString() }
  saveProjects(projects)
  return projects[idx]
}

export function deleteProject(id: string): void {
  const projects = loadProjects().filter(p => p.id !== id)
  saveProjects(projects)
}

export function getProject(id: string): Project | null {
  return loadProjects().find(p => p.id === id) ?? null
}

// --- Sections ---
export function addSection(projectId: string, data: Omit<RuleSection, 'id' | 'generatedContent' | 'filename'>): RuleSection | null {
  const projects = loadProjects()
  const idx = projects.findIndex(p => p.id === projectId)
  if (idx === -1) return null
  const section: RuleSection = {
    ...data,
    id: uid(),
    generatedContent: '',
    filename: '',
  }
  projects[idx].sections.push(section)
  projects[idx].updatedAt = new Date().toISOString()
  saveProjects(projects)
  return section
}

export function updateSection(projectId: string, sectionId: string, updates: Partial<RuleSection>): boolean {
  const projects = loadProjects()
  const pIdx = projects.findIndex(p => p.id === projectId)
  if (pIdx === -1) return false
  const sIdx = projects[pIdx].sections.findIndex(s => s.id === sectionId)
  if (sIdx === -1) return false
  projects[pIdx].sections[sIdx] = { ...projects[pIdx].sections[sIdx], ...updates }
  projects[pIdx].updatedAt = new Date().toISOString()
  saveProjects(projects)
  return true
}

export function deleteSection(projectId: string, sectionId: string): boolean {
  const projects = loadProjects()
  const idx = projects.findIndex(p => p.id === projectId)
  if (idx === -1) return false
  projects[idx].sections = projects[idx].sections.filter(s => s.id !== sectionId)
  projects[idx].updatedAt = new Date().toISOString()
  saveProjects(projects)
  return true
}

export function applyTemplateSections(
  projectId: string,
  sections: Omit<RuleSection, 'id' | 'generatedContent' | 'filename'>[],
  techTags: string[]
): boolean {
  const projects = loadProjects()
  const idx = projects.findIndex(p => p.id === projectId)
  if (idx === -1) return false
  const newSections: RuleSection[] = sections.map((s, i) => ({
    ...s,
    id: uid(),
    generatedContent: '',
    filename: '',
    order: (projects[idx].sections.length) + i,
  }))
  projects[idx].sections.push(...newSections)
  if (techTags.length && !projects[idx].techStack.length) {
    projects[idx].techStack = techTags
  }
  projects[idx].updatedAt = new Date().toISOString()
  saveProjects(projects)
  return true
}
