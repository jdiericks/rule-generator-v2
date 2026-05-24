'use client'
import { useState } from 'react'
import { TEMPLATES, CATEGORY_LABELS } from '@/lib/templates'
import { RuleTemplate } from '@/lib/types'

interface Props {
  projectId: string
  onApply: (template: RuleTemplate) => void
  onClose: () => void
}

export default function TemplatesModal({ projectId, onApply, onClose }: Props) {
  const [category, setCategory] = useState('all')
  const [appliedId, setAppliedId] = useState<string | null>(null)

  const categories = ['all', ...Array.from(new Set(TEMPLATES.map(t => t.category)))]
  const filtered = category === 'all' ? TEMPLATES : TEMPLATES.filter(t => t.category === category)

  function apply(template: RuleTemplate) {
    onApply(template)
    setAppliedId(template.id)
    setTimeout(onClose, 700)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}
    >
      <div
        className="fade-in"
        style={{ background: 'var(--bg1)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 680, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <p style={{ fontWeight: 500, fontSize: 14 }}>Templates</p>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Pre-built rule sets — customize everything after applying</p>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '6px 8px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Category filter */}
        <div style={{ padding: '10px 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: 5, flexShrink: 0, overflowX: 'auto' }}>
          {categories.map(cat => (
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

        {/* Grid */}
        <div style={{ overflowY: 'auto', padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {filtered.map(template => (
            <div
              key={template.id}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{template.name}</p>
                <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55 }}>{template.description}</p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {template.techTags.map(tag => (
                  <span key={tag} className="tag" style={{ fontSize: 10, padding: '1px 5px' }}>{tag}</span>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                  {template.sections.length} section{template.sections.length !== 1 ? 's' : ''}
                </span>
                <button
                  className={appliedId === template.id ? 'btn btn-ghost' : 'btn btn-accent'}
                  onClick={() => apply(template)}
                  style={{ fontSize: 11, padding: '5px 10px', color: appliedId === template.id ? 'var(--green)' : undefined, borderColor: appliedId === template.id ? 'var(--green)' : undefined }}
                >
                  {appliedId === template.id ? '✓ Applied' : 'Apply'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
