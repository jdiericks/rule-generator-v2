'use client'
import { useEffect, useState } from 'react'
import { CATEGORY_LABELS } from '@/lib/templates'
import { RuleTemplate, TECH_OPTIONS } from '@/lib/types'
import {
  listTemplates,
  updateTemplate,
  deleteTemplate,
} from '@/lib/storage'

interface Props {
  projectId?: string
  // Provided in project context (Templates → Apply). Omit to open as a
  // standalone manager.
  onApply?: (template: RuleTemplate) => Promise<void> | void
  onClose: () => void
}

type Filter = 'all' | 'system' | 'user'

export default function TemplatesModal({ projectId, onApply, onClose }: Props) {
  const [templates, setTemplates] = useState<RuleTemplate[] | null>(null)
  const [category, setCategory] = useState('all')
  const [filter, setFilter] = useState<Filter>('all')
  const [appliedId, setAppliedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function refresh() {
    try {
      setTemplates(await listTemplates())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load templates')
    }
  }

  useEffect(() => { refresh() }, [])

  const categories = templates
    ? ['all', ...Array.from(new Set(templates.map((t) => t.category)))]
    : ['all']
  const visible = (templates ?? [])
    .filter((t) => filter === 'all' || t.source === filter)
    .filter((t) => category === 'all' || t.category === category)

  async function apply(template: RuleTemplate) {
    if (!onApply) return
    await onApply(template)
    setAppliedId(template.id)
    setTimeout(onClose, 700)
  }

  async function handleDelete(t: RuleTemplate) {
    if (!confirm(`Delete the "${t.name}" template? This won't affect projects already using it.`)) return
    try {
      await deleteTemplate(t.id)
      await refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  const editing = editingId ? templates?.find((t) => t.id === editingId) ?? null : null

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}
    >
      <div
        className="fade-in"
        style={{ background: 'var(--bg1)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 720, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <p style={{ fontWeight: 500, fontSize: 14 }}>Templates</p>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              {onApply
                ? 'Apply a built-in or saved template to this project, or manage your own.'
                : 'Browse, edit, or delete your saved templates.'}
            </p>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '6px 8px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div style={{ padding: '10px 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 2, gap: 2 }}>
            {(['all', 'user', 'system'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '4px 10px', fontSize: 11, borderRadius: 4,
                  background: filter === f ? 'var(--bg4)' : 'transparent',
                  color: filter === f ? 'var(--text)' : 'var(--text3)',
                  fontWeight: filter === f ? 500 : 400,
                }}
              >
                {f === 'all' ? 'all' : f === 'user' ? 'yours' : 'built-in'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 5, overflowX: 'auto', flex: 1 }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '4px 10px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--mono)',
                  whiteSpace: 'nowrap', border: '1px solid',
                  borderColor: category === cat ? 'var(--accent-border)' : 'var(--border)',
                  background: category === cat ? 'var(--accent-bg)' : 'transparent',
                  color: category === cat ? 'var(--accent)' : 'var(--text3)',
                }}
              >
                {cat === 'all' ? 'all' : CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>
        </div>

        {err && (
          <div style={{ padding: '8px 1.25rem', background: 'rgba(220,60,60,0.08)', borderBottom: '1px solid var(--red)', fontSize: 12, color: 'var(--red)' }}>{err}</div>
        )}

        <div style={{ overflowY: 'auto', padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {templates === null && (
            <p style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--text3)' }}>Loading…</p>
          )}
          {templates !== null && visible.length === 0 && (
            <p style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--text3)' }}>
              {filter === 'user'
                ? 'You haven\u2019t saved any templates yet. Open a project and click "Save as template" to capture its sections.'
                : 'No templates match.'}
            </p>
          )}
          {visible.map((template) => (
            <div
              key={template.id}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{template.name}</p>
                  <span
                    className="tag"
                    style={{
                      fontSize: 10,
                      padding: '1px 6px',
                      color: template.source === 'user' ? 'var(--green)' : 'var(--text3)',
                      borderColor: template.source === 'user' ? 'var(--green)' : 'var(--border)',
                    }}
                  >
                    {template.source === 'user' ? 'yours' : 'built-in'}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55 }}>{template.description}</p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {template.techTags.map((tag) => (
                  <span key={tag} className="tag" style={{ fontSize: 10, padding: '1px 5px' }}>{tag}</span>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                  {template.sections.length} section{template.sections.length !== 1 ? 's' : ''}
                </span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {template.source === 'user' && (
                    <>
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setEditingId(template.id)}>
                        Edit
                      </button>
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px', color: 'var(--red)' }} onClick={() => handleDelete(template)}>
                        Delete
                      </button>
                    </>
                  )}
                  {onApply && projectId && (
                    <button
                      className={appliedId === template.id ? 'btn btn-ghost' : 'btn btn-accent'}
                      onClick={() => apply(template)}
                      style={{ fontSize: 11, padding: '5px 10px', color: appliedId === template.id ? 'var(--green)' : undefined, borderColor: appliedId === template.id ? 'var(--green)' : undefined }}
                    >
                      {appliedId === template.id ? '✓ Applied' : 'Apply'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {editing && (
          <EditTemplateModal
            template={editing}
            onClose={() => setEditingId(null)}
            onSaved={async () => { setEditingId(null); await refresh() }}
          />
        )}
      </div>
    </div>
  )
}

function EditTemplateModal({
  template,
  onClose,
  onSaved,
}: {
  template: RuleTemplate
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description)
  const [category, setCategory] = useState(template.category)
  const [techTags, setTechTags] = useState<string[]>(template.techTags)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!name.trim()) {
      setErr('Name is required')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      await updateTemplate(template.id, {
        name: name.trim(),
        description,
        category,
        techTags,
      })
      await onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function toggleTag(t: string) {
    setTechTags((tags) => (tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]))
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}
    >
      <div
        className="fade-in"
        style={{ background: 'var(--bg1)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span style={{ fontWeight: 500 }}>Edit template</span>
          <button className="btn-ghost" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <p className="label" style={{ marginBottom: 5 }}>Name</p>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <p className="label" style={{ marginBottom: 5 }}>Description</p>
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <p className="label" style={{ marginBottom: 5 }}>Category</p>
            <select value={category} onChange={(e) => setCategory(e.target.value as RuleTemplate['category'])}>
              {(['frontend', 'backend', 'fullstack', 'testing', 'devops', 'mcp'] as const).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="label" style={{ marginBottom: 5 }}>Tech stack tags</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {TECH_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`tag${techTags.includes(t) ? ' active' : ''}`}
                  style={{ cursor: 'pointer', fontSize: 10 }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>
            Editing metadata only. To change the sections in this template, apply it to a project, modify the sections there, and use <span style={{ fontFamily: 'var(--mono)' }}>Save as template</span> to overwrite or create a new one.
          </p>
          {err && <p style={{ fontSize: 11, color: 'var(--red)' }}>{err}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-accent" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
