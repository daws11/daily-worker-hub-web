"use client"

import { createContext, useContext, useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "../../lib/supabase/client"
import type { User, Session, AuthError } from "@supabase/supabase-js"
import type { Database } from "../../lib/supabase/types"
import { subscribeToPushNotifications as subscribeToPushDB } from "../../lib/actions/push-notifications"

type UsersRow = Database["public"]["Tables"]["users"]["Row"]

// Error helper function to map Supabase errors to user-friendly messages
function getAuthErrorMessage(error: AuthError | { message?: string; name?: string; status?: number; code?: string }): string {
  // Network errors
  if (!navigator.onLine || error.name === 'TypeError' || error.message?.includes('fetch') || error.message?.includes('network')) {
    return "Koneksi internet bermasalah. Silakan cek koneksi Anda dan coba lagi."
  }

  // Supabase specific error codes
  const message = error.message?.toLowerCase() || ''
  const code = (error as any).code || ''

  // Invalid credentials
  if (message.includes('invalid') || message.includes('wrong') || message.includes('credentials') || code === 'invalid_credentials') {
    return "Email atau password salah. Silakan coba lagi."
  }

  // User already exists
  if (message.includes('already') || message.includes('registered') || message.includes('exists') || message.includes('duplicate') || code === 'user_already_exists' || code === '23505') {
    return "Email sudah terdaftar. Silakan login atau gunakan email lain."
  }

  // Weak password
  if (message.includes('weak') || (message.includes('password') && message.includes('character')) || message.includes('too short')) {
    return "Password terlalu lemah. Gunakan minimal 8 karakter dengan kombinasi huruf dan angka."
  }

  // Email not confirmed
  if (message.includes('email not confirmed') || message.includes('not verified') || message.includes('confirmation')) {
    return "Email belum dikonfirmasi. Silakan cek inbox Anda untuk link konfirmasi."
  }

  // Rate limiting
  if (message.includes('rate limit') || message.includes('too many requests') || message.includes('request limit')) {
    return "Terlalu banyak percobaan. Silakan tunggu beberapa saat dan coba lagi."
  }

  // Email not found (for password reset)
  if (message.includes('not found') && message.includes('email')) {
    return "Email tidak terdaftar. Silakan cek kembali atau daftar akun baru."
  }

  // Default error message
  return error.message || "Terjadi kesalahan yang tidak terduga. Silakan coba lagi."
}

type AuthContextType = {
  user: User | null
  session: Session | null
  userRole: 'worker' | 'business' | null
  isLoading: boolean
  signIn: (email: string, password: string, role: 'worker' | 'business') => Promise<void>
  signInWithGoogle: (role: 'worker' | 'business') => Promise<void>
  signOut: () => Promise<void>
  signUp: (email: string, password: string, fullName: string, role: 'worker' | 'business') => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
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
        // User exists in auth but not in public.users - this is OK for unregistered users
        // Just set role to null instead of logging error
        setUserRole(null)
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
      // Validate inputs
      if (!email || !password || !fullName) {
        toast.error("Semua kolom wajib diisi")
        return
      }

      if (password.length < 6) {
        toast.error("Password harus minimal 6 karakter")
        return
      }

      // 1. Sign up with Supabase Auth
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      })

      if (signUpError) {
        const errorMessage = getAuthErrorMessage(signUpError)
        toast.error(errorMessage)
        return
      }

      if (!user) {
        toast.error("Registrasi gagal: User tidak dapat dibuat")
        return
      }

      // 2. Create user profile in public.users table
      const { error: profileError } = await (supabase.from('users') as any).insert([
        {
          id: user.id,
          email: user.email!,
          full_name: fullName,
          role: role,
          phone: '',
          avatar_url: '',
        },
      ])

      if (profileError) {
        // Handle duplicate user profile error
        if (profileError.code === '23505') {
          toast.warning("Profil pengguna sudah ada")
        } else {
          toast.error("Registrasi berhasil, tapi profil gagal dibuat. Silakan hubungi support.")
        }
      } else {
        toast.success("Registrasi berhasil! Silakan login.")
      }

      router.push("/login")
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async (email: string, password: string, role: 'worker' | 'business') => {
    setIsLoading(true)
    try {
      // Validate inputs
      if (!email || !password) {
        toast.error("Email dan password wajib diisi")
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        const errorMessage = getAuthErrorMessage(error)
        toast.error(errorMessage)
        return
      }

      if (!data.session) {
        toast.error("Login gagal: Sesi tidak dapat dibuat")
        return
      }

      toast.success("Login berhasil!")

      // Redirect based on role
      if (role === 'worker') {
        router.push("/worker/jobs")
      } else {
        router.push("/business/jobs")
      }
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        toast.error("Logout gagal: " + error.message)
        return
      }

      setUser(null)
      setSession(null)
      setUserRole(null)
      router.push("/")
      toast.success("Logout berhasil")
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    setIsLoading(true)
    try {
      // Validate input
      if (!email) {
        toast.error("Email wajib diisi")
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        const errorMessage = getAuthErrorMessage(error)
        toast.error(errorMessage)
        return
      }

      toast.success("Email reset password telah dikirim. Silakan cek inbox Anda.")
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const updatePassword = async (newPassword: string) => {
    setIsLoading(true)
    try {
      // Validate input
      if (!newPassword) {
        toast.error("Password wajib diisi")
        return
      }

      if (newPassword.length < 6) {
        toast.error("Password harus minimal 6 karakter")
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        const errorMessage = getAuthErrorMessage(error)
        toast.error(errorMessage)
        return
      }

      toast.success("Password berhasil diupdate!")
      router.push("/login")
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const signInWithGoogle = async (role: 'worker' | 'business') => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        const errorMessage = getAuthErrorMessage(error)
        toast.error(errorMessage)
        return
      }

      // OAuth redirect will happen automatically
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, userRole, isLoading, signIn, signInWithGoogle, signOut, signUp, resetPassword, updatePassword }}>
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
