import { eq } from 'drizzle-orm'
import { db } from './db/client'
import { userSettings } from './db/schema'
import { decryptSecret } from './crypto'

export async function getStoredAnthropicKey(userId: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
  if (!row?.anthropicKeyCiphertext || !row.anthropicKeyIv || !row.anthropicKeyTag) {
    return null
  }
  try {
    return decryptSecret({
      ciphertext: row.anthropicKeyCiphertext,
      iv: row.anthropicKeyIv,
      tag: row.anthropicKeyTag,
    })
  } catch {
    return null
  }
}
