'use client'
import { useState, useEffect, useCallback } from 'react'
import { RuleSection, SECTION_TYPE_META, SECTION_PLACEHOLDERS } from '@/lib/types'
import { updateSection, deleteSection } from '@/lib/storage'

interface Props {
  section: RuleSection
  projectId: string
  onUpdate: () => void
  onDelete: () => void
}

export default function SectionEditor({ section, projectId, onUpdate, onDelete }: Props) {
  const [form, setForm] = useState({ ...section })
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm({ ...section })
    setDirty(false)
    setSaved(false)
  }, [section.id])

  function set<K extends keyof RuleSection>(key: K, val: RuleSection[K]) {
    setForm(f => ({ ...f, [key]: val }))
    setDirty(true)
    setSaved(false)
  }

  const save = useCallback(async () => {
    if (!dirty) return
    await updateSection(projectId, section.id, form)
    setDirty(false)
    setSaved(true)
    onUpdate()
    setTimeout(() => setSaved(false), 2000)
  }, [dirty, form, projectId, section.id, onUpdate])

  async function handleDelete() {
    if (!confirm('Delete this section?')) return
    await deleteSection(projectId, section.id)
    onDelete()
  }

  const typeInfo = SECTION_TYPE_META.find(t => t.value === form.type)
  const placeholder = SECTION_PLACEHOLDERS[form.type]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Name + type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 10 }}>
        <div>
          <p className="label" style={{ marginBottom: 5 }}>Section name</p>
          <input value={form.name} onChange={e => set('name', e.target.value)} onBlur={save} />
        </div>
        <div>
          <p className="label" style={{ marginBottom: 5 }}>Type</p>
          <select
            value={form.type}
            onChange={e => {
              const t = SECTION_TYPE_META.find(x => x.value === e.target.value)
              setForm(f => ({ ...f, type: e.target.value as RuleSection['type'], globs: t?.globs ?? f.globs, alwaysApply: t?.alwaysApply ?? f.alwaysApply }))
              setDirty(true)
            }}
            onBlur={save}
          >
            {SECTION_TYPE_META.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Globs + always apply */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
        <div>
          <p className="label" style={{ marginBottom: 5 }}>
            Globs <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text3)', fontWeight: 400 }}>— file patterns this rule targets</span>
          </p>
          <input
            value={form.globs}
            onChange={e => set('globs', e.target.value)}
            onBlur={save}
            placeholder="**/*.{ts,tsx} or leave empty"
            style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
          />
        </div>
        <div style={{ paddingBottom: 2 }}>
          <p className="label" style={{ marginBottom: 5 }}>Always apply</p>
          <button
            onClick={() => { set('alwaysApply', !form.alwaysApply); setTimeout(save, 0) }}
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

      {/* Description */}
      <div>
        <p className="label" style={{ marginBottom: 5 }}>
          Purpose <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text3)', fontWeight: 400 }}>— one line describing this rule set</span>
        </p>
        <input
          value={form.description}
          onChange={e => set('description', e.target.value)}
          onBlur={save}
          placeholder="e.g. Enforces TypeScript code standards across the project"
        />
      </div>

      {/* Requirements */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <p className="label">
            Requirements <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text3)', fontWeight: 400 }}>— what rules should Claude generate</span>
          </p>
          {dirty && <span style={{ fontSize: 11, color: 'var(--text3)' }}>unsaved</span>}
          {saved && <span style={{ fontSize: 11, color: 'var(--green)' }}>✓ saved</span>}
        </div>
        <textarea
          value={form.requirements}
          onChange={e => set('requirements', e.target.value)}
          onBlur={save}
          placeholder={placeholder}
          rows={12}
          style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.7 }}
        />
      </div>

      {/* Footer actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
        <button className="btn btn-danger" onClick={handleDelete} style={{ fontSize: 12 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          Delete section
        </button>
        {dirty && (
          <button className="btn btn-accent" onClick={save} style={{ fontSize: 12 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Save changes
          </button>
        )}
      </div>
    </div>
  )
}
