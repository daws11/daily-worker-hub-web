"use client"

import { createContext, useContext, useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "../../lib/supabase/client"
import type { User, Session } from "@supabase/supabase-js"
import type { Database } from "../../lib/supabase/types"
import type { RealtimeChannel } from "@supabase/supabase-js"

type UsersRow = Database["public"]["Tables"]["users"]["Row"]
type WorkersRow = Database["public"]["Tables"]["workers"]["Row"]
type BusinessesRow = Database["public"]["Tables"]["businesses"]["Row"]
type BookingsRow = Database["public"]["Tables"]["bookings"]["Row"]

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
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [workerProfile, setWorkerProfile] = useState<WorkersRow | null>(null)
  const [businessProfile, setBusinessProfile] = useState<BusinessesRow | null>(null)

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
        setWorkerProfile(null)
        setBusinessProfile(null)
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

      setUserRole(data?.role ?? null)

      // Fetch worker or business profile
      if (data?.role === 'worker') {
        const { data: worker } = await supabase
          .from('workers')
          .select('*')
          .eq('user_id', user.id)
          .single()
        setWorkerProfile(worker)
        setBusinessProfile(null)
      } else if (data?.role === 'business') {
        const { data: business } = await supabase
          .from('businesses')
          .select('*')
          .eq('user_id', user.id)
          .single()
        setBusinessProfile(business)
        setWorkerProfile(null)
      }
    }

    fetchUserRole()
  }, [user])

  // Listen for real-time booking events for notifications
  useEffect(() => {
    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    if (!user || !userRole) return

    // Subscribe to bookings table changes
    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        async (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload

          // Handle new application (worker applies for job)
          if (eventType === 'INSERT') {
            const booking = newRecord as BookingsRow

            // Notify business if they own this job
            if (userRole === 'business' && businessProfile && booking.business_id === businessProfile.id) {
              // Fetch worker and job details
              const [workerResult, jobResult] = await Promise.all([
                supabase.from('workers').select('full_name').eq('id', booking.worker_id).single(),
                supabase.from('jobs').select('title').eq('id', booking.job_id).single(),
              ])

              const workerName = workerResult.data?.full_name || 'Seorang pekerja'
              const jobTitle = jobResult.data?.title || 'pekerjaan ini'

              toast.success(`Lamaran Baru`, {
                description: `${workerName} melamar untuk ${jobTitle}`,
              })
            }
          }

          // Handle application status update
          if (eventType === 'UPDATE') {
            const newBooking = newRecord as BookingsRow
            const oldBooking = oldRecord as BookingsRow

            // Notify worker if their application status changed
            if (
              userRole === 'worker' &&
              workerProfile &&
              newBooking.worker_id === workerProfile.id &&
              oldBooking.status !== newBooking.status
            ) {
              // Fetch job details
              const { data: job } = await supabase
                .from('jobs')
                .select('title')
                .eq('id', newBooking.job_id)
                .single()

              const jobTitle = job?.title || 'pekerjaan ini'

              if (newBooking.status === 'accepted') {
                toast.success(`Selamat! Lamaran Diterima`, {
                  description: `Lamaran Anda untuk ${jobTitle} telah diterima`,
                })
              } else if (newBooking.status === 'rejected') {
                toast.error(`Lamaran Ditolak`, {
                  description: `Lamaran Anda untuk ${jobTitle} telah ditolak`,
                })
              }
            }
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user, userRole, workerProfile, businessProfile])

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
      const { error: profileError } = await supabase.from('users').insert([
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
      // Clean up real-time subscription
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setUserRole(null)
      setWorkerProfile(null)
      setBusinessProfile(null)
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
