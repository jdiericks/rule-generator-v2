'use client'
import { useEffect, useState } from 'react'
import { Project, RuleSection } from '@/lib/types'
import { updateSection } from '@/lib/storage'
import { generateRule, loadLlmStatus } from '@/lib/ai-client'

interface RuleFile {
  sectionId: string
  name: string
  filename: string
  content: string
}

function kebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function fileFor(s: RuleSection): RuleFile {
  return {
    sectionId: s.id,
    name: s.name,
    filename: s.filename || `${kebab(s.name)}.mdc`,
    content: s.generatedContent,
  }
}

interface Props {
  project: Project
  onUpdate: () => void
}

export default function FilesPanel({ project, onUpdate }: Props) {
  const [aiBusy, setAiBusy] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [aiReady, setAiReady] = useState<boolean | null>(null)

  useEffect(() => {
    loadLlmStatus().then((s) => setAiReady(s.ready)).catch(() => setAiReady(false))
  }, [])

  const files: RuleFile[] = project.sections
    .filter((s) => s.generatedContent.trim())
    .map(fileFor)

  useEffect(() => {
    if (!activeId && files.length > 0) setActiveId(files[0].sectionId)
  }, [files.length, activeId])

  const activeFile = files.find((f) => f.sectionId === activeId)

  async function runAi(section: RuleSection, mode: 'draft' | 'expand') {
    if (!aiReady) {
      alert('Configure an LLM provider in Settings (Anthropic key or local Ollama).')
      return
    }
    setAiBusy(true)
    setCurrentIdx(project.sections.findIndex((s) => s.id === section.id))
    setErrors((e) => { const { [section.id]: _, ...rest } = e; return rest })
    try {
      const { content } = await generateRule({
        mode,
        project: {
          name: project.name,
          description: project.description,
          techStack: project.techStack,
        },
        section: {
          name: section.name,
          type: section.type,
          globs: section.globs,
          alwaysApply: section.alwaysApply,
          description: section.description,
          requirements: section.requirements,
        },
        existingContent: mode === 'expand' ? section.generatedContent : undefined,
      })
      const filename = section.filename || `${kebab(section.name)}.mdc`
      await updateSection(project.id, section.id, { generatedContent: content, filename })
      onUpdate()
      setActiveId(section.id)
    } catch (err) {
      setErrors((e) => ({ ...e, [section.id]: err instanceof Error ? err.message : 'AI request failed' }))
    } finally {
      setAiBusy(false)
      setCurrentIdx(-1)
    }
  }

  async function draftAll() {
    if (!aiReady) {
      alert('Configure an LLM provider in Settings (Anthropic key or local Ollama).')
      return
    }
    for (let i = 0; i < project.sections.length; i++) {
      const s = project.sections[i]
      if (s.generatedContent.trim()) continue
      await runAi(s, 'draft')
    }
  }

  function copyFile(f: RuleFile) {
    navigator.clipboard.writeText(f.content)
    setCopied(f.sectionId)
    setTimeout(() => setCopied(null), 2000)
  }

  function downloadFile(f: RuleFile) {
    const blob = new Blob([f.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = f.filename; a.click()
    URL.revokeObjectURL(url)
  }

  async function downloadZip() {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    const folder = zip.folder('.cursor/rules')!
    files.forEach((f) => folder.file(f.filename, f.content))
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${kebab(project.name || 'cursor-rules')}.zip`; a.click()
    URL.revokeObjectURL(url)
  }

  if (project.sections.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text3)' }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 28, marginBottom: 12, opacity: 0.3 }}>.mdc</p>
        <p style={{ fontSize: 13 }}>Add sections in the editor to start writing rule files</p>
      </div>
    )
  }

  const emptySections = project.sections.filter((s) => !s.generatedContent.trim())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {files.length > 0 && (
          <button className="btn" onClick={downloadZip} style={{ fontSize: 12 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download .zip ({files.length})
          </button>
        )}
        {aiReady && emptySections.length > 0 && (
          <button
            className="btn btn-accent"
            onClick={draftAll}
            disabled={aiBusy}
            style={{ fontSize: 12 }}
            title="Use AI to draft .mdc content for every empty section"
          >
            {aiBusy && currentIdx >= 0 ? (
              <>
                <svg className="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Drafting {project.sections[currentIdx]?.name}…
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                Draft {emptySections.length} empty section{emptySections.length !== 1 ? 's' : ''} with AI
              </>
            )}
          </button>
        )}
        {!aiReady && (
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            AI assist is optional — configure an LLM provider in Settings (Anthropic or local Ollama) to enable bulk drafting.
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {project.sections.map((section, i) => {
          const file = section.generatedContent.trim() ? fileFor(section) : null
          const isBusy = aiBusy && currentIdx === i
          const err = errors[section.id]
          return (
            <div
              key={section.id}
              data-mobile-wrap="true"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: file ? 'pointer' : 'default', transition: 'border-color 0.1s', borderColor: activeId === section.id && file ? 'var(--border2)' : 'var(--border)' }}
              onClick={() => file && setActiveId(section.id)}
            >
              {isBusy ? (
                <svg className="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              ) : (
                <div style={{ background: file ? 'var(--green)' : err ? 'var(--red)' : 'var(--bg4)', width: 7, height: 7, borderRadius: '50%' }} />
              )}
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{section.name}</span>
              <span className="type-badge">{section.type}</span>
              {file ? (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>{file.filename}</span>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>empty</span>
              )}
              {err && <span style={{ fontSize: 11, color: 'var(--red)' }}>error</span>}
              {aiReady && (
                <button
                  className="btn btn-ghost"
                  onClick={(e) => { e.stopPropagation(); runAi(section, file ? 'expand' : 'draft') }}
                  disabled={aiBusy}
                  style={{ fontSize: 11, padding: '3px 7px', flexShrink: 0 }}
                  title={file ? 'Expand with AI' : 'Draft with AI'}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/></svg>
                  {file ? 'Expand' : 'Draft'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {activeFile && (
        <div className="fade-in" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg1)' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
              .cursor/rules/{activeFile.filename}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn" onClick={() => copyFile(activeFile)} style={{ fontSize: 11, padding: '4px 8px' }}>
                {copied === activeFile.sectionId ? (
                  <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied</>
                ) : (
                  <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</>
                )}
              </button>
              <button className="btn" onClick={() => downloadFile(activeFile)} style={{ fontSize: 11, padding: '4px 8px' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download
              </button>
            </div>
          </div>
          <pre style={{ maxHeight: 420, border: 'none', borderRadius: 0, fontSize: 12 }}>
            {activeFile.content}
          </pre>
        </div>
      )}
    </div>
  )
}
