"use client"

import { createContext, useContext, useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "../../lib/supabase/client"
import type { User, Session } from "@supabase/supabase-js"
import type { Database } from "../../lib/supabase/types"
import { subscribeToPushNotifications as subscribeToPushDB } from "../../lib/actions/push-notifications"

type UsersRow = Database["public"]["Tables"]["users"]["Row"]

type AuthContextType = {
  user: User | null
  session: Session | null
  userRole: 'worker' | 'business' | null
  isLoading: boolean
  signIn: (email: string, password: string, role: 'worker' | 'business') => Promise<void>
  signOut: () => Promise<void>
  signUp: (email: string, password: string, fullName: string, role: 'worker' | 'business') => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userRole, setUserRole] = useState<'worker' | 'business' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch user role from database
  useEffect(() => {
    async function fetchUserRole() {
      if (!user) {
        setUserRole(null)
        return
      }

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching user role:', error)
        return
      }

      setUserRole((data as any)?.role ?? null)
    }

    fetchUserRole()
  }, [user])

  // Initialize push notifications for authenticated users
  const pushInitRef = useRef(false)

  useEffect(() => {
    async function initializePushNotifications() {
      // Only initialize once per session
      if (pushInitRef.current || !user) {
        return
      }

      pushInitRef.current = true

      // Check if browser supports push notifications
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        return
      }

      try {
        // Check current permission
        const permission = Notification.permission

        if (permission === 'denied') {
          // User has already denied permission, don't ask again
          return
        }

        if (permission === 'granted') {
          // User already granted permission, subscribe them
          await subscribeUser()
        } else if (permission === 'default') {
          // Request permission on first visit
          const result = await Notification.requestPermission()

          if (result === 'granted') {
            await subscribeUser()
          }
        }
      } catch (error) {
        // Silently fail - don't interrupt user experience
      }
    }

    async function subscribeUser() {
      try {
        // Get or register service worker
        let registration = await navigator.serviceWorker.getRegistration()
        if (!registration) {
          registration = await navigator.serviceWorker.register('/sw.js')
        }

        // Check if already subscribed
        const existingSubscription = await registration.pushManager.getSubscription()
        if (existingSubscription) {
          // Verify subscription is stored in database
          const subscriptionJson = existingSubscription.toJSON()
          if (subscriptionJson.endpoint && subscriptionJson.keys) {
            await subscribeToPushDB(
              user.id,
              subscriptionJson.endpoint,
              subscriptionJson.keys.auth || '',
              subscriptionJson.keys.p256dh || ''
            )
          }
          return
        }

        // Get VAPID public key
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_KEY
        if (!vapidPublicKey) {
          return
        }

        // Convert VAPID key to Uint8Array
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey) as BufferSource

        // Subscribe to push notifications
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        })

        // Store subscription in database
        const subscriptionJson = subscription.toJSON()
        if (subscriptionJson.endpoint && subscriptionJson.keys) {
          await subscribeToPushDB(
            user.id,
            subscriptionJson.endpoint,
            subscriptionJson.keys.auth || '',
            subscriptionJson.keys.p256dh || ''
          )
        }
      } catch (error) {
        // Silently fail - don't interrupt user experience
      }
    }

    // Convert VAPID public key from base64 to Uint8Array
    function urlBase64ToUint8Array(base64String: string): Uint8Array {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
      const rawData = window.atob(base64)
      const outputArray = new Uint8Array(rawData.length)

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
      }

      return outputArray
    }

    initializePushNotifications()

    // Reset ref when user logs out
    return () => {
      if (!user) {
        pushInitRef.current = false
      }
    }
  }, [user])

  const signUp = async (email: string, password: string, fullName: string, role: 'worker' | 'business') => {
    setIsLoading(true)
    try {
      // 1. Sign up with Supabase Auth
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (signUpError) {
        toast.error("Registrasi gagal: " + signUpError.message)
        return
      }

      if (!user) {
        toast.error("Registrasi gagal: User not created")
        return
      }

      // 2. Create user profile in public.users table
      const { error: profileError } = await (supabase
        .from('users') as any)
        .insert({
          id: user.id,
          email: user.email!,
          full_name: fullName,
          role: role,
          phone: '',
          avatar_url: '',
        })

      if (profileError) {
        console.error('Error creating user profile:', profileError)
        toast.error("Registrasi berhasil, tapi profile gagal dibuat")
      } else {
        toast.success("Registrasi berhasil! Silakan login.")
      }

      router.push("/login")
    } catch (error) {
      console.error('Sign up error:', error)
      toast.error("Registrasi gagal")
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async (email: string, password: string, role: 'worker' | 'business') => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error("Login gagal: " + error.message)
        return
      }

      if (!data.session) {
        toast.error("Login gagal: Session not created")
        return
      }

      toast.success("Login berhasil!")

      // Redirect based on role
      if (role === 'worker') {
        router.push("/dashboard-worker-jobs")
      } else {
        router.push("/dashboard-business-jobs")
      }
    } catch (error) {
      console.error('Sign in error:', error)
      toast.error("Login gagal")
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setUserRole(null)
      router.push("/")
      toast.success("Logout berhasil")
    } catch (error) {
      console.error('Sign out error:', error)
      toast.error("Logout gagal")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, userRole, isLoading, signIn, signOut, signUp }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
