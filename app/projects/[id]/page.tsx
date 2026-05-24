'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Project, SECTION_TYPE_META, SectionType, TECH_OPTIONS } from '@/lib/types'
import { getProject, addSection, updateProject, applyTemplateSections } from '@/lib/storage'
import { RuleTemplate } from '@/lib/types'
import SectionEditor from '@/components/SectionEditor'
import GeneratePanel from '@/components/GeneratePanel'
import TemplatesModal from '@/components/TemplatesModal'
import GithubPanel from '@/components/GithubPanel'

type Tab = 'editor' | 'generate' | 'github'

const SECTION_ICONS: Record<string, string> = {
  'code-style': 'M',
  'file-structure': 'F',
  'mcp-api': 'P',
  'components': 'C',
  'testing': 'T',
  'git': 'G',
  'database': 'D',
  'auth': 'A',
  'architecture': 'R',
  'custom': '~',
}

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('editor')
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState('')
  const [showStackEditor, setShowStackEditor] = useState(false)

  const refresh = useCallback(async () => {
    const p = await getProject(projectId)
    if (!p) { router.push('/'); return }
    setProject(p)
  }, [projectId, router])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (project && !activeSectionId && project.sections.length > 0) {
      setActiveSectionId(project.sections[0].id)
    }
  }, [project?.sections.length])

  if (!project) return null

  const activeSection = project.sections.find(s => s.id === activeSectionId)
  const generatedCount = project.sections.filter(s => s.generatedContent).length

  async function handleAddSection(type: SectionType) {
    const meta = SECTION_TYPE_META.find(t => t.value === type)!
    const s = await addSection(projectId, {
      name: meta.label,
      type,
      globs: meta.globs,
      alwaysApply: meta.alwaysApply,
      description: '',
      requirements: '',
      order: project!.sections.length,
    })
    if (s) {
      setActiveSectionId(s.id)
      setTab('editor')
    }
    setShowTypePicker(false)
    refresh()
  }

  async function saveName() {
    if (nameVal.trim()) await updateProject(projectId, { name: nameVal.trim() })
    setEditingName(false)
    refresh()
  }

  async function toggleTech(t: string) {
    const stack = project!.techStack
    await updateProject(projectId, { techStack: stack.includes(t) ? stack.filter(x => x !== t) : [...stack, t] })
    refresh()
  }

  async function applyTemplate(template: RuleTemplate) {
    await applyTemplateSections(projectId, template.sections.map((s, i) => ({ ...s, order: i })), template.techTags)
    refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 1.25rem', height: 52, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button className="btn-ghost" onClick={() => router.push('/')} style={{ padding: '6px 8px' }} title="Back to projects">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {editingName ? (
            <input
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
              autoFocus
              style={{ fontSize: 14, fontWeight: 500, padding: '4px 8px', width: 300, background: 'var(--bg2)' }}
            />
          ) : (
            <button
              onClick={() => { setNameVal(project.name); setEditingName(true) }}
              className="btn-ghost"
              style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', padding: '4px 8px' }}
              title="Click to rename"
            >
              {project.name}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowTemplates(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Templates
          </button>

          <div style={{ display: 'flex', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 2, gap: 2 }}>
            {(['editor', 'generate', 'github'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '4px 10px', fontSize: 12, borderRadius: 4,
                  background: tab === t ? 'var(--bg4)' : 'transparent',
                  color: tab === t ? 'var(--text)' : 'var(--text3)',
                  fontWeight: tab === t ? 500 : 400,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {t === 'generate' && generatedCount > 0 && (
                  <span style={{ background: 'var(--green)', color: 'var(--bg)', fontSize: 10, fontFamily: 'var(--mono)', padding: '0 4px', borderRadius: 3, lineHeight: '16px' }}>
                    {generatedCount}
                  </span>
                )}
                {t}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside style={{ width: 210, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden', background: 'var(--bg1)' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <button
              onClick={() => setShowStackEditor(!showStackEditor)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '2px 0', color: 'var(--text2)', fontSize: 12 }}
            >
              <span className="label">Stack ({project.techStack.length})</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showStackEditor ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {!showStackEditor && project.techStack.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6 }}>
                {project.techStack.slice(0, 5).map(t => <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>)}
                {project.techStack.length > 5 && <span style={{ fontSize: 10, color: 'var(--text3)' }}>+{project.techStack.length - 5}</span>}
              </div>
            )}
            {showStackEditor && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 3, maxHeight: 140, overflowY: 'auto' }}>
                {TECH_OPTIONS.map(t => (
                  <button
                    key={t}
                    onClick={() => toggleTech(t)}
                    className={`tag${project.techStack.includes(t) ? ' active' : ''}`}
                    style={{ cursor: 'pointer', fontSize: 10 }}
                  >{t}</button>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
            <p className="label" style={{ padding: '4px 4px 6px', display: 'block' }}>Sections</p>
            {project.sections.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text3)', padding: '4px', lineHeight: 1.5 }}>No sections yet. Add one below or apply a template.</p>
            )}
            {project.sections.map(s => (
              <button
                key={s.id}
                onClick={() => { setActiveSectionId(s.id); setTab('editor') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 8px',
                  borderRadius: 'var(--radius)', marginBottom: 2, textAlign: 'left', fontSize: 12,
                  background: activeSectionId === s.id && tab === 'editor' ? 'var(--bg3)' : 'transparent',
                  color: activeSectionId === s.id && tab === 'editor' ? 'var(--text)' : 'var(--text2)',
                  fontWeight: activeSectionId === s.id && tab === 'editor' ? 500 : 400,
                  border: '1px solid transparent',
                  borderColor: activeSectionId === s.id && tab === 'editor' ? 'var(--border)' : 'transparent',
                }}
              >
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', width: 14, textAlign: 'center', flexShrink: 0 }}>
                  {SECTION_ICONS[s.type] || '~'}
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                {s.generatedContent && <div className="dot green" style={{ width: 5, height: 5, flexShrink: 0 }} />}
              </button>
            ))}
          </div>

          <div style={{ padding: '8px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <button
              className="btn"
              style={{ width: '100%', fontSize: 12, justifyContent: 'center', gap: 5 }}
              onClick={() => setShowTypePicker(!showTypePicker)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Add section
            </button>
            {showTypePicker && (
              <div className="fade-in" style={{ marginTop: 4, background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                {SECTION_TYPE_META.map(t => (
                  <button
                    key={t.value}
                    onClick={() => handleAddSection(t.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px',
                      fontSize: 12, color: 'var(--text2)', borderBottom: '1px solid var(--border)',
                      textAlign: 'left', borderRadius: 0,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text2)' }}
                  >
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', width: 12, textAlign: 'center' }}>{SECTION_ICONS[t.value]}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {tab === 'editor' ? (
            activeSection ? (
              <SectionEditor
                key={activeSection.id}
                section={activeSection}
                projectId={projectId}
                onUpdate={refresh}
                onDelete={() => { setActiveSectionId(null); refresh() }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', gap: 12 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 36, opacity: 0.2 }}>.mdc</span>
                <p style={{ fontSize: 13 }}>Select a section to edit</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => setShowTypePicker(true)} style={{ fontSize: 12 }}>Add section</button>
                  <button className="btn btn-accent" onClick={() => setShowTemplates(true)} style={{ fontSize: 12 }}>Browse templates</button>
                </div>
              </div>
            )
          ) : tab === 'generate' ? (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ fontWeight: 500, fontSize: 15, marginBottom: 4 }}>Generate rule files</p>
                <p style={{ fontSize: 12, color: 'var(--text3)' }}>
                  Generates one <span style={{ fontFamily: 'var(--mono)' }}>.mdc</span> per section. Files go in <span style={{ fontFamily: 'var(--mono)' }}>.cursor/rules/</span> in your repo.
                </p>
              </div>
              <GeneratePanel project={project} onUpdate={refresh} />
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ fontWeight: 500, fontSize: 15, marginBottom: 4 }}>GitHub</p>
                <p style={{ fontSize: 12, color: 'var(--text3)' }}>
                  Link this project to a GitHub repository and commit generated{' '}
                  <span style={{ fontFamily: 'var(--mono)' }}>.mdc</span> files directly.
                </p>
              </div>
              <GithubPanel project={project} />
            </div>
          )}
        </main>
      </div>

      {showTemplates && (
        <TemplatesModal
          projectId={projectId}
          onApply={applyTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  )
}
