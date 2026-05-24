'use client'
import { useEffect, useState } from 'react'
import { Project, RuleSection } from '@/lib/types'
import { getApiKeyStatus, updateSection } from '@/lib/storage'

interface GeneratedFile {
  sectionId: string
  name: string
  filename: string
  content: string
}

function kebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

interface Props {
  project: Project
  onUpdate: () => void
}

export default function GeneratePanel({ project, onUpdate }: Props) {
  const [generating, setGenerating] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [files, setFiles] = useState<GeneratedFile[]>(() =>
    project.sections
      .filter(s => s.generatedContent)
      .map(s => ({ sectionId: s.id, name: s.name, filename: s.filename || `${kebab(s.name)}.mdc`, content: s.generatedContent }))
  )
  const [activeId, setActiveId] = useState<string | null>(files[0]?.sectionId ?? null)
  const [copied, setCopied] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)

  useEffect(() => {
    getApiKeyStatus().then((s) => setHasApiKey(s.hasKey)).catch(() => setHasApiKey(false))
  }, [])

  const activeFile = files.find(f => f.sectionId === activeId)

  async function generateAll() {
    if (!hasApiKey) { alert('Add your Anthropic API key in Settings first.'); return }
    if (project.sections.length === 0) return

    setGenerating(true)
    setErrors({})
    const out: GeneratedFile[] = []

    for (let i = 0; i < project.sections.length; i++) {
      setCurrentIdx(i)
      const section = project.sections[i]

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectName: project.name,
            projectDescription: project.description,
            techStack: project.techStack,
            section: {
              name: section.name,
              type: section.type,
              globs: section.globs,
              alwaysApply: section.alwaysApply,
              description: section.description,
              requirements: section.requirements,
            },
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Generation failed')

        const filename = `${kebab(section.name)}.mdc`
        out.push({ sectionId: section.id, name: section.name, filename, content: data.content })

        await updateSection(project.id, section.id, { generatedContent: data.content, filename })
        onUpdate()

        setFiles([...out])
        if (i === 0) setActiveId(section.id)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setErrors(e => ({ ...e, [section.id]: msg }))
      }
    }

    setGenerating(false)
    setCurrentIdx(-1)
  }

  async function generateOne(section: RuleSection) {
    if (!hasApiKey) { alert('Add your Anthropic API key in Settings first.'); return }
    setGenerating(true)
    setCurrentIdx(project.sections.findIndex(s => s.id === section.id))

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: project.name,
          projectDescription: project.description,
          techStack: project.techStack,
          section: { name: section.name, type: section.type, globs: section.globs, alwaysApply: section.alwaysApply, description: section.description, requirements: section.requirements },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')

      const filename = `${kebab(section.name)}.mdc`
      await updateSection(project.id, section.id, { generatedContent: data.content, filename })
      onUpdate()

      setFiles(prev => {
        const exists = prev.findIndex(f => f.sectionId === section.id)
        const updated = { sectionId: section.id, name: section.name, filename, content: data.content }
        return exists >= 0 ? prev.map((f, i) => i === exists ? updated : f) : [...prev, updated]
      })
      setActiveId(section.id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setErrors(e => ({ ...e, [section.id]: msg }))
    }

    setGenerating(false)
    setCurrentIdx(-1)
  }

  function copyFile(f: GeneratedFile) {
    navigator.clipboard.writeText(f.content)
    setCopied(f.sectionId)
    setTimeout(() => setCopied(null), 2000)
  }

  function downloadFile(f: GeneratedFile) {
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
    files.forEach(f => folder.file(f.filename, f.content))
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
        <p style={{ fontSize: 13 }}>Add sections in the editor to generate rule files</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          className="btn btn-accent"
          onClick={generateAll}
          disabled={generating || !hasApiKey}
          style={{ fontSize: 12 }}
        >
          {generating && currentIdx >= 0 ? (
            <>
              <svg className="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Generating {project.sections[currentIdx]?.name}… ({currentIdx + 1}/{project.sections.length})
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              Generate all {project.sections.length} section{project.sections.length !== 1 ? 's' : ''}
            </>
          )}
        </button>
        {files.length > 1 && (
          <button className="btn" onClick={downloadZip} style={{ fontSize: 12 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download .zip
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {project.sections.map((section, i) => {
          const file = files.find(f => f.sectionId === section.id)
          const isGenerating = generating && currentIdx === i
          const err = errors[section.id]
          return (
            <div
              key={section.id}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: file ? 'pointer' : 'default', transition: 'border-color 0.1s', borderColor: activeId === section.id && file ? 'var(--border2)' : 'var(--border)' }}
              onClick={() => file && setActiveId(section.id)}
            >
              {isGenerating ? (
                <svg className="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              ) : (
                <div className={`dot ${file ? 'green' : err ? '' : ''}`} style={{ background: file ? 'var(--green)' : err ? 'var(--red)' : 'var(--bg4)' }} />
              )}
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{section.name}</span>
              <span className="type-badge">{section.type}</span>
              {file && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>{file.filename}</span>}
              {err && <span style={{ fontSize: 11, color: 'var(--red)' }}>error</span>}
              <button
                className="btn btn-ghost"
                onClick={e => { e.stopPropagation(); generateOne(section) }}
                disabled={generating}
                style={{ fontSize: 11, padding: '3px 7px', flexShrink: 0 }}
                title="Regenerate this section"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/></svg>
                {file ? 'Regen' : 'Generate'}
              </button>
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
