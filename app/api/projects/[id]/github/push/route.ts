import { NextRequest, NextResponse } from 'next/server'
import { and, eq, asc } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { projects, sections, projectGithubLinks } from '@/lib/db/schema'
import { requireUserId, badRequest, notFound, serverError } from '@/lib/api-utils'
import { getOctokit } from '@/lib/github'

export const runtime = 'nodejs'

function kebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUserId()
  if (auth instanceof NextResponse) return auth

  let body: { commitMessage?: string; branch?: string } = {}
  try { body = await req.json() } catch { /* allow empty body */ }

  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, params.id), eq(projects.userId, auth.userId)))
      .limit(1)
    if (!project) return notFound('Project not found')

    const [link] = await db
      .select()
      .from(projectGithubLinks)
      .where(eq(projectGithubLinks.projectId, project.id))
    if (!link) return badRequest('No GitHub repo linked to this project')

    const sectionRows = await db
      .select()
      .from(sections)
      .where(eq(sections.projectId, project.id))
      .orderBy(asc(sections.order))

    const filesToWrite = sectionRows
      .filter((s) => s.generatedContent && s.generatedContent.trim())
      .map((s) => ({
        path: `${link.rulesPath}/${s.filename || `${kebab(s.name)}.mdc`}`,
        content: s.generatedContent,
      }))

    if (filesToWrite.length === 0) {
      return badRequest('No generated rule files to push. Generate sections first.')
    }

    const octokit = await getOctokit(auth.userId)
    if (!octokit) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 412 })
    }

    const branch = body.branch?.trim() || link.branch || 'main'
    const owner = link.owner
    const repo = link.repo

    // 1. Resolve branch HEAD (or fall back to repo default branch).
    let baseSha: string
    let baseRef = `heads/${branch}`
    try {
      const ref = await octokit.git.getRef({ owner, repo, ref: baseRef })
      baseSha = ref.data.object.sha
    } catch (err: unknown) {
      // Branch may not exist yet — try the repo's default branch and then create
      // the requested branch from it.
      const status =
        typeof err === 'object' && err && 'status' in err ? (err as { status: number }).status : 0
      if (status !== 404) throw err
      const { data: repoData } = await octokit.repos.get({ owner, repo })
      const defRef = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${repoData.default_branch}`,
      })
      baseSha = defRef.data.object.sha
      await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha: baseSha,
      })
    }

    const { data: baseCommit } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: baseSha,
    })
    const baseTreeSha = baseCommit.tree.sha

    // 2. Create blobs for each file.
    const blobs = await Promise.all(
      filesToWrite.map((f) =>
        octokit.git
          .createBlob({ owner, repo, content: f.content, encoding: 'utf-8' })
          .then((b) => ({ path: f.path, sha: b.data.sha }))
      )
    )

    // 3. Build a tree on top of the current base tree.
    const { data: tree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: blobs.map((b) => ({
        path: b.path,
        mode: '100644',
        type: 'blob',
        sha: b.sha,
      })),
    })

    // 4. Create commit pointing at the new tree.
    const message =
      body.commitMessage?.trim() ||
      `chore(cursor-rules): update ${filesToWrite.length} rule file${
        filesToWrite.length === 1 ? '' : 's'
      } from rules builder`
    const { data: commit } = await octokit.git.createCommit({
      owner,
      repo,
      message,
      tree: tree.sha,
      parents: [baseSha],
    })

    // 5. Move the branch ref to the new commit.
    await octokit.git.updateRef({
      owner,
      repo,
      ref: baseRef,
      sha: commit.sha,
      force: false,
    })

    await db
      .update(projectGithubLinks)
      .set({
        branch,
        lastPushedSha: commit.sha,
        lastPushedAt: new Date(),
      })
      .where(eq(projectGithubLinks.projectId, project.id))

    return NextResponse.json({
      ok: true,
      commitSha: commit.sha,
      commitUrl: `https://github.com/${owner}/${repo}/commit/${commit.sha}`,
      branch,
      filesWritten: filesToWrite.map((f) => f.path),
    })
  } catch (err) {
    return serverError(err)
  }
}
