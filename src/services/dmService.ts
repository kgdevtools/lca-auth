'use server'

import { createClient } from '@/utils/supabase/server'
import { getCurrentUserWithProfile } from '@/utils/auth/academyAuth'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DmThreadSummary {
  threadId:      string
  otherUserId:   string
  otherName:     string
  lastMessage:   string | null
  lastMessageAt: string
  unreadCount:   number
}

export interface DmMessage {
  id:        string
  senderId:  string
  body:      string
  createdAt: string
  isMine:    boolean
  isRemoved: boolean
}

export interface DmUserResult {
  id:       string
  name:     string
}

const EPOCH = '1970-01-01T00:00:00Z'

/** Order-normalizes a pair so (a, b) and (b, a) always resolve to the same
 *  slot — dm_threads has a check constraint enforcing user_a_id < user_b_id. */
function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

// ── Public: search users by name (for starting a new thread) ─────────────────

export async function searchUsers(query: string): Promise<DmUserResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []
  const { user } = await getCurrentUserWithProfile()
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name')
    .ilike('full_name', `%${trimmed}%`)
    .neq('id', user.id)
    .limit(10)

  return (data ?? [])
    .filter(p => p.full_name)
    .map(p => ({ id: p.id, name: p.full_name as string }))
}

// ── Public: thread list (with unread counts) ──────────────────────────────────

export async function listThreads(): Promise<DmThreadSummary[]> {
  const { user } = await getCurrentUserWithProfile()
  const supabase = await createClient()

  const { data: threads } = await supabase
    .from('dm_threads')
    .select('id, user_a_id, user_b_id, last_message_at')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false })

  if (!threads || threads.length === 0) return []

  const threadIds = threads.map(t => t.id)
  const otherIds = threads.map(t => (t.user_a_id === user.id ? t.user_b_id : t.user_a_id))

  const [profilesRes, lastMessagesRes, readsRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name').in('id', otherIds),
    supabase.from('dm_messages').select('thread_id, sender_id, body, created_at')
      .in('thread_id', threadIds).order('created_at', { ascending: false }),
    supabase.from('dm_thread_reads').select('thread_id, last_read_at')
      .eq('user_id', user.id).in('thread_id', threadIds),
  ])

  const nameById = new Map((profilesRes.data ?? []).map(p => [p.id, p.full_name ?? 'Unknown']))
  const readById = new Map((readsRes.data ?? []).map(r => [r.thread_id, r.last_read_at]))

  // Last message per thread — messages come back newest-first across all
  // threads, so the first hit per thread_id is that thread's latest.
  const lastMsgByThread = new Map<string, { body: string; senderId: string }>()
  // Unread = messages from the other person, newer than my read cursor.
  const unreadByThread = new Map<string, number>()
  for (const m of lastMessagesRes.data ?? []) {
    if (!lastMsgByThread.has(m.thread_id)) {
      lastMsgByThread.set(m.thread_id, { body: m.body, senderId: m.sender_id })
    }
    if (m.sender_id !== user.id) {
      const cursor = readById.get(m.thread_id) ?? EPOCH
      if (m.created_at > cursor) {
        unreadByThread.set(m.thread_id, (unreadByThread.get(m.thread_id) ?? 0) + 1)
      }
    }
  }

  return threads.map((t, i) => {
    const otherUserId = otherIds[i]
    const last = lastMsgByThread.get(t.id)
    return {
      threadId:      t.id,
      otherUserId,
      otherName:     nameById.get(otherUserId) ?? 'Unknown',
      lastMessage:   last?.body ?? null,
      lastMessageAt: t.last_message_at,
      unreadCount:   unreadByThread.get(t.id) ?? 0,
    }
  })
}

/** Total unread across every thread — drives the nav badge. Cheap subset of
 *  listThreads' work; kept separate so the nav icon doesn't need the full list. */
export async function getUnreadCount(): Promise<number> {
  const threads = await listThreads()
  return threads.reduce((sum, t) => sum + t.unreadCount, 0)
}

// ── Public: one thread's messages ─────────────────────────────────────────────

export async function getThreadMessages(threadId: string): Promise<DmMessage[]> {
  const { user } = await getCurrentUserWithProfile()
  const supabase = await createClient()

  const { data } = await supabase
    .from('dm_messages')
    .select('id, sender_id, body, created_at, is_removed')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  return (data ?? []).map(m => ({
    id: m.id, senderId: m.sender_id,
    // Removed messages keep their row (moderation audit trail) but never
    // show the real body to anyone, including the sender.
    body: m.is_removed ? '[message removed]' : m.body,
    createdAt: m.created_at,
    isMine: m.sender_id === user.id,
    isRemoved: !!m.is_removed,
  }))
}

// ── Public: report a message (flag for coach/admin review) ───────────────────

export async function reportMessage(messageId: string, threadId: string, reason: string): Promise<void> {
  const trimmed = reason.trim()
  if (!trimmed) throw new Error('A reason is required')
  const { user } = await getCurrentUserWithProfile()
  const supabase = await createClient()
  const { error } = await supabase
    .from('dm_reports')
    .insert({ message_id: messageId, thread_id: threadId, reported_by: user.id, reason: trimmed })
  if (error) throw new Error(error.message)
}

// ── Public: mark a thread read ────────────────────────────────────────────────

export async function markThreadRead(threadId: string): Promise<void> {
  const { user } = await getCurrentUserWithProfile()
  const supabase = await createClient()
  await supabase
    .from('dm_thread_reads')
    .upsert({ thread_id: threadId, user_id: user.id, last_read_at: new Date().toISOString() })
}

// ── Public: send a message (creates the thread on first contact) ─────────────

export async function sendMessage(
  otherUserId: string,
  body: string,
): Promise<{ threadId: string; message: DmMessage }> {
  const trimmed = body.trim()
  if (!trimmed) throw new Error('Message cannot be empty')
  const { user } = await getCurrentUserWithProfile()
  if (otherUserId === user.id) throw new Error("Can't message yourself")
  const supabase = await createClient()

  const [userAId, userBId] = orderPair(user.id, otherUserId)

  // Find-or-create the thread for this pair.
  let threadId: string
  const { data: existing } = await supabase
    .from('dm_threads')
    .select('id')
    .eq('user_a_id', userAId)
    .eq('user_b_id', userBId)
    .maybeSingle()

  if (existing) {
    threadId = existing.id
  } else {
    const { data: created, error } = await supabase
      .from('dm_threads')
      .insert({ user_a_id: userAId, user_b_id: userBId })
      .select('id')
      .single()
    if (error || !created) throw new Error(error?.message ?? 'Failed to start conversation')
    threadId = created.id
  }

  const { data: message, error: msgError } = await supabase
    .from('dm_messages')
    .insert({ thread_id: threadId, sender_id: user.id, body: trimmed })
    .select('id, sender_id, body, created_at')
    .single()
  if (msgError || !message) throw new Error(msgError?.message ?? 'Failed to send message')

  await supabase.from('dm_threads').update({ last_message_at: message.created_at }).eq('id', threadId)
  // Sending counts as having read up to your own message.
  await supabase.from('dm_thread_reads')
    .upsert({ thread_id: threadId, user_id: user.id, last_read_at: message.created_at })

  return {
    threadId,
    message: { id: message.id, senderId: message.sender_id, body: message.body, createdAt: message.created_at, isMine: true, isRemoved: false },
  }
}

/** Send within an already-known thread (reply flow) — same as sendMessage but
 *  skips the find-or-create when the caller already has the thread open. */
export async function sendMessageInThread(threadId: string, body: string): Promise<DmMessage> {
  const trimmed = body.trim()
  if (!trimmed) throw new Error('Message cannot be empty')
  const { user } = await getCurrentUserWithProfile()
  const supabase = await createClient()

  const { data: message, error } = await supabase
    .from('dm_messages')
    .insert({ thread_id: threadId, sender_id: user.id, body: trimmed })
    .select('id, sender_id, body, created_at')
    .single()
  if (error || !message) throw new Error(error?.message ?? 'Failed to send message')

  await supabase.from('dm_threads').update({ last_message_at: message.created_at }).eq('id', threadId)
  await supabase.from('dm_thread_reads')
    .upsert({ thread_id: threadId, user_id: user.id, last_read_at: message.created_at })

  return { id: message.id, senderId: message.sender_id, body: message.body, createdAt: message.created_at, isMine: true, isRemoved: false }
}
