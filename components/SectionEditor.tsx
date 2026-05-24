'use client'
import { useState, useEffect, useCallback } from 'react'
import { Project, RuleSection, SECTION_TYPE_META, SECTION_PLACEHOLDERS } from '@/lib/types'
import { updateSection, deleteSection, getApiKeyStatus } from '@/lib/storage'
import { syncFrontMatter } from '@/lib/mdc'

interface Props {
  section: RuleSection
  project: Project
  onUpdate: () => void
  onDelete: () => void
}

function kebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Metadata fields whose values are reflected in the MDC frontmatter and
// therefore should also live-update the rule content.
type MetaField = 'name' | 'globs' | 'alwaysApply' | 'description'

export default function SectionEditor({ section, project, onUpdate, onDelete }: Props) {
  const [form, setForm] = useState({ ...section })
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)
  const [aiBusy, setAiBusy] = useState<null | 'draft' | 'expand'>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  useEffect(() => {
    setForm({ ...section })
    setDirty(false)
    setSaved(false)
    setAiError(null)
  }, [section.id])

  useEffect(() => {
    getApiKeyStatus().then((s) => setHasApiKey(s.hasKey)).catch(() => setHasApiKey(false))
  }, [])

  function set<K extends keyof RuleSection>(key: K, val: RuleSection[K]) {
    setForm((f) => ({ ...f, [key]: val }))
    setDirty(true)
    setSaved(false)
  }

  // Update a metadata field AND keep the MDC frontmatter inside the
  // generatedContent in sync with it, so users see the file header update
  // live as they tweak the section.
  function setMeta<K extends MetaField>(key: K, val: RuleSection[K]) {
    setForm((f) => {
      const next = { ...f, [key]: val }
      next.generatedContent = syncFrontMatter(
        f.generatedContent,
        {
          description: next.description,
          globs: next.globs,
          alwaysApply: next.alwaysApply,
        },
        next.name
      )
      return next
    })
    setDirty(true)
    setSaved(false)
  }

  const save = useCallback(
    async (overrides?: Partial<RuleSection>) => {
      const next = overrides ? { ...form, ...overrides } : form
      if (!dirty && !overrides) return
      const filename = next.filename || `${kebab(next.name || 'rule')}.mdc`
      const payload = { ...next, filename }
      await updateSection(project.id, section.id, payload)
      setForm(payload)
      setDirty(false)
      setSaved(true)
      onUpdate()
      setTimeout(() => setSaved(false), 1500)
    },
    [dirty, form, project.id, section.id, onUpdate]
  )

  async function handleDelete() {
    if (!confirm('Delete this section?')) return
    await deleteSection(project.id, section.id)
    onDelete()
  }

  async function runAi(mode: 'draft' | 'expand') {
    setAiError(null)
    setAiBusy(mode)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          projectName: project.name,
          projectDescription: project.description,
          techStack: project.techStack,
          existingContent: mode === 'expand' ? form.generatedContent : undefined,
          section: {
            name: form.name,
            type: form.type,
            globs: form.globs,
            alwaysApply: form.alwaysApply,
            description: form.description,
            requirements: form.requirements,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI request failed')
      const content = data.content as string
      setForm((f) => ({ ...f, generatedContent: content }))
      await save({ generatedContent: content })
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI request failed')
    } finally {
      setAiBusy(null)
    }
  }

  const placeholder = SECTION_PLACEHOLDERS[form.type]
  const hasContent = !!form.generatedContent.trim()
  const aiAvailable = hasApiKey === true

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 10 }}>
        <div>
          <p className="label" style={{ marginBottom: 5 }}>Section name</p>
          <input value={form.name} onChange={(e) => setMeta('name', e.target.value)} onBlur={() => save()} />
        </div>
        <div>
          <p className="label" style={{ marginBottom: 5 }}>Type</p>
          <select
            value={form.type}
            onChange={(e) => {
              const t = SECTION_TYPE_META.find((x) => x.value === e.target.value)
              setForm((f) => {
                const next = {
                  ...f,
                  type: e.target.value as RuleSection['type'],
                  globs: t?.globs ?? f.globs,
                  alwaysApply: t?.alwaysApply ?? f.alwaysApply,
                }
                next.generatedContent = syncFrontMatter(
                  f.generatedContent,
                  {
                    description: next.description,
                    globs: next.globs,
                    alwaysApply: next.alwaysApply,
                  },
                  next.name
                )
                return next
              })
              setDirty(true)
            }}
            onBlur={() => save()}
          >
            {SECTION_TYPE_META.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
        <div>
          <p className="label" style={{ marginBottom: 5 }}>
            Globs <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text3)', fontWeight: 400 }}>— file patterns this rule targets</span>
          </p>
          <input
            value={form.globs}
            onChange={(e) => setMeta('globs', e.target.value)}
            onBlur={() => save()}
            placeholder="**/*.{ts,tsx} or leave empty"
            style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
          />
        </div>
        <div style={{ paddingBottom: 2 }}>
          <p className="label" style={{ marginBottom: 5 }}>Always apply</p>
          <button
            onClick={() => { setMeta('alwaysApply', !form.alwaysApply); setTimeout(() => save(), 0) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
              border: '1px solid', borderRadius: 'var(--radius)', fontSize: 12,
              borderColor: form.alwaysApply ? 'var(--green)' : 'var(--border)',
              background: form.alwaysApply ? 'var(--green-bg)' : 'var(--bg2)',
              color: form.alwaysApply ? 'var(--green)' : 'var(--text2)',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: form.alwaysApply ? 'var(--green)' : 'var(--text3)', flexShrink: 0 }} />
            {form.alwaysApply ? 'Yes' : 'No'}
          </button>
        </div>
      </div>

      <div>
        <p className="label" style={{ marginBottom: 5 }}>
          Purpose <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text3)', fontWeight: 400 }}>— one line describing this rule set</span>
        </p>
        <input
          value={form.description}
          onChange={(e) => setMeta('description', e.target.value)}
          onBlur={() => save()}
          placeholder="e.g. Enforces TypeScript code standards across the project"
        />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <p className="label">
            Rule content <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text3)', fontWeight: 400 }}>
              — the actual <span style={{ fontFamily: 'var(--mono)' }}>.mdc</span> file. Frontmatter auto-syncs from the fields above; the body is yours.
            </span>
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {dirty && <span style={{ fontSize: 11, color: 'var(--text3)' }}>unsaved</span>}
            {saved && <span style={{ fontSize: 11, color: 'var(--green)' }}>✓ saved</span>}
          </div>
        </div>
        <textarea
          value={form.generatedContent}
          onChange={(e) => set('generatedContent', e.target.value)}
          onBlur={() => save()}
          placeholder={`---\ndescription: ${form.description || 'one-line description'}\nglobs: ${form.globs}\nalwaysApply: ${form.alwaysApply}\n---\n\n# ${form.name}\n\nWrite your rule content here, or use AI assistance below.`}
          rows={16}
          style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.6 }}
        />
      </div>

      {aiAvailable && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
            <p className="label">
              AI prompt notes <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text3)', fontWeight: 400 }}>— optional bullet list passed to Claude when drafting or expanding</span>
            </p>
          </div>
          <textarea
            value={form.requirements}
            onChange={(e) => set('requirements', e.target.value)}
            onBlur={() => save()}
            placeholder={placeholder}
            rows={5}
            style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.7 }}
          />
        </div>
      )}

      <div
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>AI assist</span>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>
          {aiAvailable
            ? 'Optional — drafts or expands the content above using Claude.'
            : 'Optional — add an Anthropic API key in Settings to enable.'}
        </span>
        <div style={{ flex: 1 }} />
        <button
          className="btn"
          style={{ fontSize: 11 }}
          onClick={() => runAi('draft')}
          disabled={!aiAvailable || aiBusy !== null}
          title={hasContent ? 'Replace content with a fresh AI draft' : 'Draft a starter .mdc with AI'}
        >
          {aiBusy === 'draft' ? (
            <>
              <svg className="spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Drafting…
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/></svg>
              {hasContent ? 'Redraft' : 'Draft with AI'}
            </>
          )}
        </button>
        <button
          className="btn"
          style={{ fontSize: 11 }}
          onClick={() => runAi('expand')}
          disabled={!aiAvailable || !hasContent || aiBusy !== null}
          title={!hasContent ? 'Add content above before expanding' : 'Expand and refine your existing content with AI'}
        >
          {aiBusy === 'expand' ? (
            <>
              <svg className="spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Expanding…
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
              Expand with AI
            </>
          )}
        </button>
      </div>

      {aiError && (
        <p style={{ fontSize: 11, color: 'var(--red)' }}>{aiError}</p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
        <button className="btn btn-danger" onClick={handleDelete} style={{ fontSize: 12 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          Delete section
        </button>
        {dirty && (
          <button className="btn btn-accent" onClick={() => save()} style={{ fontSize: 12 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Save changes
          </button>
        )}
      </div>
    </div>
  )
}
