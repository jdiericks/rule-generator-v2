'use client'
import { useEffect, useState } from 'react'
import { Project } from '@/lib/types'
import {
  getGithubStatus,
  listGithubRepos,
  getProjectGithubLink,
  linkProjectToRepo,
  unlinkProjectRepo,
  pushProjectRules,
  GithubStatus,
  GithubRepo,
  ProjectGithubLink,
  PushResult,
} from '@/lib/storage'

interface Props {
  project: Project
}

export default function GithubPanel({ project }: Props) {
  const [status, setStatus] = useState<GithubStatus | null>(null)
  const [link, setLink] = useState<ProjectGithubLink | null>(null)
  const [repos, setRepos] = useState<GithubRepo[] | null>(null)
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [repoFilter, setRepoFilter] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [branch, setBranch] = useState('')
  const [rulesPath, setRulesPath] = useState('.cursor/rules')
  const [commitMessage, setCommitMessage] = useState('')
  const [pushing, setPushing] = useState(false)
  const [pushResult, setPushResult] = useState<PushResult | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const [s, l] = await Promise.all([getGithubStatus(), getProjectGithubLink(project.id)])
        setStatus(s)
        setLink(l)
        if (l) {
          setBranch(l.branch)
          setRulesPath(l.rulesPath)
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load GitHub status')
      }
    })()
  }, [project.id])

  async function openPicker() {
    setShowPicker(true)
    if (repos !== null) return
    setLoadingRepos(true)
    try {
      setRepos(await listGithubRepos())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load repos')
    } finally {
      setLoadingRepos(false)
    }
  }

  async function pickRepo(r: GithubRepo) {
    try {
      const next = await linkProjectToRepo(project.id, {
        owner: r.owner,
        repo: r.name,
        branch: link?.branch || r.defaultBranch,
        rulesPath: rulesPath || '.cursor/rules',
        defaultBranch: r.defaultBranch,
      })
      setLink(next)
      setBranch(next.branch)
      setRulesPath(next.rulesPath)
      setShowPicker(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to link repo')
    }
  }

  async function saveLinkSettings() {
    if (!link) return
    try {
      const next = await linkProjectToRepo(project.id, {
        owner: link.owner,
        repo: link.repo,
        branch: branch.trim() || link.defaultBranch || 'main',
        rulesPath: rulesPath.trim() || '.cursor/rules',
        defaultBranch: link.defaultBranch ?? undefined,
      })
      setLink(next)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save settings')
    }
  }

  async function unlink() {
    if (!confirm('Unlink this project from the repo?')) return
    await unlinkProjectRepo(project.id)
    setLink(null)
    setPushResult(null)
  }

  async function push() {
    setPushing(true)
    setErr(null)
    setPushResult(null)
    try {
      const res = await pushProjectRules(project.id, {
        commitMessage: commitMessage.trim() || undefined,
        branch: branch.trim() || undefined,
      })
      setPushResult(res)
      // Refresh link to get updated last-pushed metadata.
      setLink(await getProjectGithubLink(project.id))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Push failed')
    } finally {
      setPushing(false)
    }
  }

  const generatedCount = project.sections.filter((s) => s.generatedContent).length
  const canPush = !!link && generatedCount > 0 && !pushing

  if (status && !status.connected) {
    return (
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <GithubLogo />
          <span style={{ fontWeight: 500, fontSize: 14 }}>GitHub not connected</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>
          Sign out and back in with GitHub, granting the <code style={{ fontFamily: 'var(--mono)' }}>repo</code> scope,
          to push generated <code style={{ fontFamily: 'var(--mono)' }}>.mdc</code> files into your repositories.
        </p>
      </div>
    )
  }

  if (!status) return null

  const filteredRepos =
    repos && repoFilter
      ? repos.filter((r) => r.fullName.toLowerCase().includes(repoFilter.toLowerCase()))
      : repos

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GithubLogo />
            <div>
              <p style={{ fontSize: 13, fontWeight: 500 }}>
                Connected as <span style={{ fontFamily: 'var(--mono)' }}>{status.login}</span>
              </p>
              <p style={{ fontSize: 11, color: 'var(--text3)' }}>
                Push generated rule files to any repo you can write to.
              </p>
            </div>
          </div>
          {link ? (
            <button className="btn btn-ghost" style={{ fontSize: 11, color: 'var(--red)' }} onClick={unlink}>
              Unlink repo
            </button>
          ) : (
            <button className="btn btn-accent" style={{ fontSize: 12 }} onClick={openPicker}>
              Choose repo
            </button>
          )}
        </div>
      </div>

      {link && (
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 500 }}>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
                {link.owner}/{link.repo}
              </span>
            </p>
            <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={openPicker}>
              Change repo
            </button>
          </div>

          <div data-mobile-stack-grid="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <p className="label" style={{ marginBottom: 5 }}>Branch</p>
              <input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                onBlur={saveLinkSettings}
                placeholder={link.defaultBranch ?? 'main'}
                style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
              />
            </div>
            <div>
              <p className="label" style={{ marginBottom: 5 }}>Rules path</p>
              <input
                value={rulesPath}
                onChange={(e) => setRulesPath(e.target.value)}
                onBlur={saveLinkSettings}
                placeholder=".cursor/rules"
                style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
              />
            </div>
          </div>

          <div>
            <p className="label" style={{ marginBottom: 5 }}>Commit message (optional)</p>
            <input
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="chore(cursor-rules): update rule files"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
            <p style={{ fontSize: 11, color: 'var(--text3)' }}>
              {generatedCount === 0
                ? 'No generated files yet — generate rules first.'
                : `${generatedCount} file${generatedCount === 1 ? '' : 's'} ready to push.`}
              {link.lastPushedAt && (
                <>
                  {' '}· last push <span style={{ fontFamily: 'var(--mono)' }}>
                    {new Date(link.lastPushedAt).toLocaleString()}
                  </span>
                </>
              )}
            </p>
            <button className="btn btn-accent" style={{ fontSize: 12 }} disabled={!canPush} onClick={push}>
              {pushing ? (
                <>
                  <svg className="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Pushing…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                  Push to GitHub
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {pushResult && (
        <div style={{ background: 'rgba(120,180,120,0.08)', border: '1px solid var(--green)', borderRadius: 'var(--radius-lg)', padding: '10px 14px', fontSize: 12 }}>
          <p style={{ color: 'var(--green)', marginBottom: 4 }}>
            ✓ Pushed {pushResult.filesWritten.length} file{pushResult.filesWritten.length === 1 ? '' : 's'} to{' '}
            <span style={{ fontFamily: 'var(--mono)' }}>{pushResult.branch}</span>
          </p>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
            {pushResult.filesWritten.join(', ')}
          </p>
          <a
            href={pushResult.commitUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 11, color: 'var(--accent)' }}
          >
            View commit {pushResult.commitSha.slice(0, 7)} →
          </a>
        </div>
      )}

      {err && (
        <div style={{ background: 'rgba(220,60,60,0.08)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: 'var(--red)' }}>
          {err}
        </div>
      )}

      {showPicker && (
        <div
          data-mobile-modal-overlay
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setShowPicker(false)}
        >
          <div
            className="fade-in"
            data-mobile-modal-full="true"
            style={{ background: 'var(--bg1)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, maxHeight: '75vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 500 }}>Choose a repository</p>
              <button className="btn-ghost" onClick={() => setShowPicker(false)} style={{ padding: '4px 6px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
              <input
                value={repoFilter}
                onChange={(e) => setRepoFilter(e.target.value)}
                placeholder="Filter repositories…"
                style={{ fontSize: 12 }}
                autoFocus
              />
            </div>
            <div style={{ overflowY: 'auto', padding: '8px 8px' }}>
              {loadingRepos && <p style={{ padding: 16, fontSize: 12, color: 'var(--text3)' }}>Loading repositories…</p>}
              {!loadingRepos && filteredRepos && filteredRepos.length === 0 && (
                <p style={{ padding: 16, fontSize: 12, color: 'var(--text3)' }}>No repositories match.</p>
              )}
              {filteredRepos?.map((r) => {
                const canPush = r.permissions?.push || r.permissions?.admin
                return (
                  <button
                    key={r.id}
                    onClick={() => canPush && pickRepo(r)}
                    disabled={!canPush}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      width: '100%', padding: '8px 10px', fontSize: 12, color: 'var(--text)',
                      borderRadius: 'var(--radius)', textAlign: 'left',
                      opacity: canPush ? 1 : 0.5, cursor: canPush ? 'pointer' : 'not-allowed',
                    }}
                    onMouseEnter={(e) => canPush && ((e.currentTarget as HTMLElement).style.background = 'var(--bg2)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontFamily: 'var(--mono)' }}>{r.fullName}</span>
                      {r.private && (
                        <span className="tag" style={{ fontSize: 10 }}>private</span>
                      )}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {canPush ? r.defaultBranch : 'read-only'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function GithubLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.87-1.54-3.87-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.08-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.77.11 3.06.74.8 1.19 1.82 1.19 3.08 0 4.42-2.7 5.4-5.27 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.79.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  )
}
