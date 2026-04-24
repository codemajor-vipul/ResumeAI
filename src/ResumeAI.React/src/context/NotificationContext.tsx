/**
 * NotificationContext
 *
 * Single source of truth for:
 *  - The SignalR hub connection lifecycle (connect, auto-reconnect, teardown)
 *  - The user's notification list (prepended live as server pushes arrive)
 *  - The unread badge count
 *  - The toast queue (auto-cleared after 5 s)
 *
 * Usage:
 *   Wrap authenticated routes with <NotificationProvider>.
 *   Consume anywhere via useNotifications().
 */
import {
  createContext, useContext, useEffect, useRef,
  useState, useCallback, type ReactNode,
} from 'react'
import * as signalR from '@microsoft/signalr'
import { notifApi } from '../api'
import { useAuth } from './AuthContext'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Notification {
  notificationId: number
  recipientId:    number
  type:           string
  title:          string
  message:        string
  channel:        string
  relatedId?:     string
  relatedType?:   string
  isRead:         boolean
  sentAt:         string
}

export interface Toast {
  id:      number
  title:   string
  message: string
  type:    string
}

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

interface NotificationContextValue {
  notifications:    Notification[]
  unreadCount:      number
  connectionStatus: ConnectionStatus
  toasts:           Toast[]
  dismissToast:     (id: number) => void
  markRead:         (notificationId: number) => Promise<void>
  markAll:          () => Promise<void>
  remove:           (notificationId: number) => Promise<void>
  refresh:          () => Promise<void>
}

// ─── Context ─────────────────────────────────────────────────────────────────

const Ctx = createContext<NotificationContextValue | null>(null)

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationProvider>')
  return ctx
}

// ─── Provider ────────────────────────────────────────────────────────────────

let toastSeq = 0

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [status,        setStatus]        = useState<ConnectionStatus>('connecting')
  const [toasts,        setToasts]        = useState<Toast[]>([])

  const hubRef = useRef<signalR.HubConnection | null>(null)

  // ── REST helpers ────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([notifApi.getAll(), notifApi.unreadCount()])
      setNotifications(list)
      setUnreadCount(count)
    } catch { /* network hiccup — keep stale state */ }
  }, [])

  const markRead = useCallback(async (id: number) => {
    await notifApi.markRead(id)
    setNotifications(prev => prev.map(n => n.notificationId === id ? { ...n, isRead: true } : n))
    setUnreadCount(c => Math.max(0, c - 1))
  }, [])

  const markAll = useCallback(async () => {
    await notifApi.markAllRead()
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }, [])

  const remove = useCallback(async (id: number) => {
    await notifApi.delete(id)
    setNotifications(prev => prev.filter(n => n.notificationId !== id))
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const pushToast = useCallback((n: Notification) => {
    const id = ++toastSeq
    setToasts(prev => [...prev, { id, title: n.title, message: n.message, type: n.type }])
    // Auto-dismiss after 5 s
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }, [])

  // ── SignalR lifecycle ────────────────────────────────────────────
  useEffect(() => {
    if (!token) return

    const hub = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/notifications', {
        accessTokenFactory: () => token,
        transport: signalR.HttpTransportType.WebSockets |
                   signalR.HttpTransportType.ServerSentEvents |
                   signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    hubRef.current = hub

    // ── Event handlers ──────────────────────────────────────────
    hub.on('ReceiveNotification', (notif: Notification) => {
      setNotifications(prev => [notif, ...prev])
      if (!notif.isRead) setUnreadCount(c => c + 1)
      pushToast(notif)
    })

    hub.on('UnreadCountUpdated', (count: number) => {
      setUnreadCount(count)
    })

    hub.onreconnecting(() => setStatus('reconnecting'))
    hub.onreconnected(async () => {
      setStatus('connected')
      await refresh()           // re-sync in case we missed events
    })
    hub.onclose(() => setStatus('disconnected'))

    // ── Boot ────────────────────────────────────────────────────
    const connect = async () => {
      try {
        setStatus('connecting')
        await hub.start()
        setStatus('connected')
        await refresh()
      } catch {
        setStatus('disconnected')
        // withAutomaticReconnect handles retries
      }
    }

    connect()

    return () => {
      hub.stop()
    }
  }, [token, refresh, pushToast])

  return (
    <Ctx.Provider value={{
      notifications, unreadCount, connectionStatus: status,
      toasts, dismissToast,
      markRead, markAll, remove, refresh,
    }}>
      {children}
    </Ctx.Provider>
  )
}
