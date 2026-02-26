"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "../../lib/supabase/client"
import type { User, Session } from "@supabase/supabase-js"
import type { Database } from "../../lib/supabase/types"
import { useTranslation } from "../../lib/i18n/hooks"

type UsersRow = Database["public"]["Tables"]["users"]["Row"]

type AuthContextType = {
  user: User | null
  session: Session | null
  userRole: 'worker' | 'business' | 'admin' | null
  isLoading: boolean
  signIn: (email: string, password: string, role: 'worker' | 'business' | 'admin') => Promise<void>
  signOut: () => Promise<void>
  signUp: (email: string, password: string, fullName: string, role: 'worker' | 'business' | 'admin') => Promise<void>
  signInWithGoogle: (role: 'worker' | 'business' | 'admin') => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userRole, setUserRole] = useState<'worker' | 'business' | 'admin' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { t } = useTranslation()

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

  const signUp = async (email: string, password: string, fullName: string, role: 'worker' | 'business' | 'admin') => {
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
        toast.error(t('auth.registrationFailed', { message: signUpError.message }))
        return
      }

      if (!user) {
        toast.error(t('auth.registrationUserNotCreated'))
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
        toast.error(t('auth.registrationProfileFailed'))
      } else {
        toast.success(t('auth.registrationSuccessPleaseLogin'))
      }

      router.push("/login")
    } catch (error) {
      console.error('Sign up error:', error)
      toast.error(t('auth.registrationFailedGeneric'))
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async (email: string, password: string, role: 'worker' | 'business' | 'admin') => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(t('auth.loginFailed', { message: error.message }))
        return
      }

      if (!data.session) {
        toast.error(t('auth.loginSessionNotCreated'))
        return
      }

      toast.success(t('auth.loginSuccess'))

      // Redirect based on role
      if (role === 'worker') {
        router.push("/dashboard-worker-jobs")
      } else if (role === 'business') {
        router.push("/dashboard-business-jobs")
      } else {
        router.push("/dashboard-admin")
      }
    } catch (error) {
      console.error('Sign in error:', error)
      toast.error(t('auth.loginFailedGeneric'))
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
      toast.success(t('auth.logoutSuccess'))
    } catch (error) {
      console.error('Sign out error:', error)
      toast.error(t('auth.logoutFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const signInWithGoogle = async (role: 'worker' | 'business' | 'admin') => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
        },
      })

      if (error) {
        toast.error(t('auth.loginFailed', { message: error.message }))
      }
    } catch (error) {
      console.error('Google sign in error:', error)
      toast.error(t('auth.loginFailedGeneric'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, userRole, isLoading, signIn, signOut, signUp, signInWithGoogle }}>
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
