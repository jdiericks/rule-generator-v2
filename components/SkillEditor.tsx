'use client'
import { useEffect, useState, useCallback } from 'react'
import { Project, Skill } from '@/lib/types'
import { updateSkill, deleteSkill } from '@/lib/storage'
import { generateSkill, loadLlmStatus } from '@/lib/ai-client'
import { syncSkillFrontMatter, skillFilePath } from '@/lib/skills'

interface Props {
  project: Project
  skill: Skill
  onUpdate: () => void
  onDelete: () => void
}

type MetaField = 'name' | 'description' | 'allowedTools'

export default function SkillEditor({ project, skill, onUpdate, onDelete }: Props) {
  const [form, setForm] = useState({ ...skill })
  const [toolsInput, setToolsInput] = useState((skill.allowedTools ?? []).join(', '))
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [aiReady, setAiReady] = useState<boolean | null>(null)
  const [aiBusy, setAiBusy] = useState<null | 'draft' | 'expand'>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    setForm({ ...skill })
    setToolsInput((skill.allowedTools ?? []).join(', '))
    setDirty(false)
    setSaved(false)
    setAiError(null)
  }, [skill.id])

  useEffect(() => {
    loadLlmStatus().then((s) => setAiReady(s.ready)).catch(() => setAiReady(false))
  }, [])

  function set<K extends keyof Skill>(key: K, val: Skill[K]) {
    setForm((f) => ({ ...f, [key]: val }))
    setDirty(true)
    setSaved(false)
  }

  function setMeta<K extends MetaField>(key: K, val: Skill[K]) {
    setForm((f) => {
      const next = { ...f, [key]: val }
      next.body = syncSkillFrontMatter(f.body, {
        name: next.name,
        description: next.description,
        allowedTools: next.allowedTools ?? [],
      })
      return next
    })
    setDirty(true)
    setSaved(false)
  }

  const save = useCallback(
    async (overrides?: Partial<Skill>) => {
      const next = overrides ? { ...form, ...overrides } : form
      if (!dirty && !overrides) return
      await updateSkill(project.id, skill.id, next)
      setForm(next)
      setDirty(false)
      setSaved(true)
      onUpdate()
      setTimeout(() => setSaved(false), 1500)
    },
    [dirty, form, project.id, skill.id, onUpdate]
  )

  function commitTools() {
    const list = toolsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (JSON.stringify(list) !== JSON.stringify(form.allowedTools)) {
      setMeta('allowedTools', list)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this skill?')) return
    await deleteSkill(project.id, skill.id)
    onDelete()
  }

  async function runAi(mode: 'draft' | 'expand') {
    setAiError(null)
    setAiBusy(mode)
    try {
      const { content } = await generateSkill({
        mode,
        project: {
          name: project.name,
          description: project.description,
          techStack: project.techStack,
        },
        skill: {
          name: form.name,
          description: form.description,
          allowedTools: form.allowedTools ?? [],
        },
        notes,
        existingContent: mode === 'expand' ? form.body : undefined,
      })
      setForm((f) => ({ ...f, body: content }))
      await save({ body: content })
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI request failed')
    } finally {
      setAiBusy(null)
    }
  }

  const aiAvailable = aiReady === true
  const hasBody = !!form.body.trim()
  const outputPath = skillFilePath(project.skillFormat, form.name || 'untitled')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div data-mobile-stack-grid="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <p className="label" style={{ marginBottom: 5 }}>Skill name</p>
          <input value={form.name} onChange={(e) => setMeta('name', e.target.value)} onBlur={() => save()} />
        </div>
        <div>
          <p className="label" style={{ marginBottom: 5 }}>
            Output path <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text3)', fontWeight: 400 }}>— determined by project format</span>
          </p>
          <input value={outputPath} disabled style={{ fontFamily: 'var(--mono)', fontSize: 12, opacity: 0.85 }} />
        </div>
      </div>

      <div>
        <p className="label" style={{ marginBottom: 5 }}>
          Description <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text3)', fontWeight: 400 }}>— one or two sentences describing when this skill should be used</span>
        </p>
        <input
          value={form.description}
          onChange={(e) => setMeta('description', e.target.value)}
          onBlur={() => save()}
          placeholder="e.g. Apply when the user asks about database migrations or schema changes"
        />
      </div>

      <div>
        <p className="label" style={{ marginBottom: 5 }}>
          Allowed tools <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text3)', fontWeight: 400 }}>— optional comma-separated list (cursor / opencode honour this)</span>
        </p>
        <input
          value={toolsInput}
          onChange={(e) => setToolsInput(e.target.value)}
          onBlur={() => { commitTools(); save() }}
          placeholder="e.g. Bash, Read, Edit, Grep"
          style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
        />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <p className="label">
            Skill content <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text3)', fontWeight: 400 }}>
              — the SKILL.md file the agent reads. Frontmatter auto-syncs from the fields above; the body is yours.
            </span>
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {dirty && <span style={{ fontSize: 11, color: 'var(--text3)' }}>unsaved</span>}
            {saved && <span style={{ fontSize: 11, color: 'var(--green)' }}>✓ saved</span>}
          </div>
        </div>
        <textarea
          value={form.body}
          onChange={(e) => set('body', e.target.value)}
          onBlur={() => save()}
          placeholder={`---\nname: ${form.name || 'Skill name'}\ndescription: ${form.description || 'When to use this skill'}\n---\n\n# ${form.name || 'Skill'}\n\nDescribe the trigger conditions, steps, and references…`}
          rows={18}
          style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.6 }}
        />
      </div>

      {aiAvailable && (
        <div>
          <p className="label" style={{ marginBottom: 5 }}>
            AI prompt notes <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text3)', fontWeight: 400 }}>— optional context passed to Claude when drafting or expanding</span>
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="- Focus on incremental migrations\n- Mention drizzle-kit usage\n- Include a rollback example"
            rows={4}
            style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.6 }}
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
            ? 'Optional — drafts or expands the skill content above using your configured LLM.'
            : 'Optional — configure an LLM provider in Settings (Anthropic or local Ollama) to enable.'}
        </span>
        <div style={{ flex: 1 }} />
        <button
          className="btn"
          style={{ fontSize: 11 }}
          onClick={() => runAi('draft')}
          disabled={!aiAvailable || aiBusy !== null}
          title={hasBody ? 'Replace content with a fresh AI draft' : 'Draft a starter SKILL.md with AI'}
        >
          {aiBusy === 'draft' ? (
            <>
              <svg className="spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Drafting…
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/></svg>
              {hasBody ? 'Redraft' : 'Draft with AI'}
            </>
          )}
        </button>
        <button
          className="btn"
          style={{ fontSize: 11 }}
          onClick={() => runAi('expand')}
          disabled={!aiAvailable || !hasBody || aiBusy !== null}
          title={!hasBody ? 'Add content above before expanding' : 'Expand and refine your existing skill content with AI'}
        >
          {aiBusy === 'expand' ? (
            <>
              <svg className="spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Expanding…
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/></svg>
              Expand with AI
            </>
          )}
        </button>
      </div>

      {aiError && <p style={{ fontSize: 11, color: 'var(--red)' }}>{aiError}</p>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
        <button className="btn btn-danger" onClick={handleDelete} style={{ fontSize: 12 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          Delete skill
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
