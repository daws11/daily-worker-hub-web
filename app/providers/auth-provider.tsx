"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/types";
import { useTranslation } from "../../lib/i18n/hooks";

type UsersRow = Database["public"]["Tables"]["users"]["Row"];

type AuthContextType = {
  user: User | null;
  session: Session | null;
  userRole: "worker" | "business" | "admin" | null;
  isLoading: boolean;
  signIn: (
    email: string,
    password: string,
    role: "worker" | "business" | "admin",
  ) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: "worker" | "business" | "admin",
  ) => Promise<void>;
  signInWithGoogle: (role: "worker" | "business" | "admin") => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<
    "worker" | "business" | "admin" | null
  >(null);
  const [isLoading, setIsLoading] = useState(true); // Start with true to prevent premature redirects
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    // Get initial session
    console.log("[AUTH] 🔄 Starting session check...");
    setIsLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[AUTH] 📦 Session loaded:", {
        hasSession: !!session,
        userEmail: session?.user?.email || "null",
        userId: session?.user?.id?.substring(0, 8) || "null",
      });
      // Update all state in a batch - React will handle this properly
      const user = session?.user ?? null;
      setSession(session);
      setUser(user);
      // Set loading to false after state updates are queued
      setIsLoading(false);
      console.log(
        "[AUTH] ✅ Session check complete, isLoading set to false, user:",
        user?.email || "null",
      );
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log(
        "[AUTH] 🔐 Auth state changed:",
        _event,
        "user:",
        session?.user?.email || "null",
      );
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user role from database
  useEffect(() => {
    async function fetchUserRole() {
      if (!user) {
        setUserRole(null);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        return;
      }

      setUserRole((data as any)?.role ?? null);
    }

    fetchUserRole();
  }, [user]);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: "worker" | "business" | "admin",
  ) => {
    setIsLoading(true);
    console.log("[AUTH signUp] Starting...");
    console.log("[AUTH signUp] Email:", email, "Role:", role);

    try {
      // 1. Sign up with Supabase Auth
      console.log("[AUTH signUp] Step 1: Calling supabase.auth.signUp...");
      const {
        data: { user },
        error: signUpError,
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role, // Store role in user_metadata for middleware access
          },
        },
      });

      console.log("[AUTH signUp] Supabase auth response:", {
        user: !!user,
        error: !!signUpError,
      });

      if (signUpError) {
        console.error("[AUTH signUp] Sign up error:", signUpError);
        toast.error(
          t("auth.registrationFailed", { message: signUpError.message }),
        );
        return;
      }

      if (!user) {
        console.error("[AUTH signUp] No user created");
        toast.error(t("auth.registrationUserNotCreated"));
        return;
      }

      // 2. Create user profile in public.users table via API (bypasses RLS)
      console.log("[AUTH signUp] Step 2: Creating user profile via API...");
      const response = await fetch('/api/auth/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email!,
          full_name: fullName,
          role: role,
        }),
      });

      const profileResult = await response.json();
      console.log("[AUTH signUp] Profile API response:", { 
        ok: response.ok, 
        error: !profileResult.success 
      });

      if (!response.ok || !profileResult.success) {
        console.error("[AUTH signUp] Profile creation error:", profileResult);
        toast.error(t("auth.registrationProfileFailed"));
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return;
      }

      // 3. Create wallet for the user (if worker or business)
      console.log(
        "[AUTH signUp] Step 3: Creating wallet for user...",
      );
      if (role === 'worker' || role === 'business') {
        const { error: walletError } = await (supabase as any)
          .from('wallets')
          .insert({
            user_id: user.id,
            balance: 0.00,
            pending_balance: 0.00,
          })

        console.log('[AUTH signUp] Wallet insert response:', { error: !!walletError })

        if (walletError) {
          // Log the error but don't block registration
          console.error('[AUTH signUp] Wallet creation error (non-blocking):', walletError)
        }
      }

      console.log(
        "[AUTH] Registration successful, redirecting to onboarding...",
      );
      console.log("[AUTH] Role:", role);

      toast.success(t("auth.registrationSuccess"));

      // 3. Redirect to onboarding page (worker will be redirected to onboarding/worker)
      // Use window.location for more reliable redirect in App Router
      if (typeof window !== "undefined") {
        console.log("[AUTH] Window is available, preparing redirect...");
        // Use setTimeout to ensure toast can be displayed before redirect
        setTimeout(() => {
          console.log("[AUTH] Redirecting to:", `/onboarding`);
          window.location.href = `/onboarding`;
        }, 100);
      } else {
        console.error("[AUTH] Window is not available!");
      }
    } catch (error) {
      console.error("Sign up error:", error);
      toast.error(t("auth.registrationFailedGeneric"));
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (
    email: string,
    password: string,
    role: "worker" | "business" | "admin",
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(t("auth.loginFailed", { message: error.message }));
        return;
      }

      if (!data.session) {
        toast.error(t("auth.loginSessionNotCreated"));
        return;
      }

      // Fetch user role from database (more reliable than form input)
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single();

      // Be more defensive - if query fails, default to the role parameter
      let userRole = (userData as any)?.role || role;

      if (userError) {
        console.error("Error fetching user role:", userError);
        console.log("[AUTH signIn] Using role from form input:", role);
      }

      if (!userData) {
        console.warn(
          "[AUTH signIn] User not found in public.users, creating record...",
        );

        // Auto-create missing user record in public.users
        const { error: createError } = await (
          supabase.from("users") as any
        ).insert({
          id: data.user.id,
          email: data.user.email!,
          full_name:
            data.user.user_metadata?.full_name ||
            data.user.email!.split("@")[0],
          role: role,
          phone: "",
          avatar_url: "",
        });

        if (createError) {
          console.error(
            "[AUTH signIn] Failed to create user record:",
            createError,
          );
        } else {
          console.log("[AUTH signIn] User record created successfully");
          userRole = role;
        }
      }

      // UPDATE user_metadata.role so middleware can access it
      console.log("[AUTH signIn] Updating user_metadata.role to:", userRole);
      const { error: updateError } = await supabase.auth.updateUser({
        data: { role: userRole },
      });

      if (updateError) {
        console.error(
          "[AUTH signIn] Failed to update user_metadata:",
          updateError,
        );
        // Don't block login, but log the error
      } else {
        console.log("[AUTH signIn] user_metadata.role updated successfully");
      }

      // Refresh session to ensure cookies are properly set
      const {
        data: { session: refreshedSession },
      } = await supabase.auth.refreshSession();
      console.log("[AUTH signIn] Session refreshed:", !!refreshedSession);

      setUserRole(userRole);
      setSession(refreshedSession || data.session);
      setUser(refreshedSession?.user ?? data.user);

      toast.success(t("auth.loginSuccess"));

      // Redirect based on database role (not form input)
      // Workers and businesses go to onboarding (which checks if they have a profile)
      // Use a slightly longer delay to ensure cookies are fully persisted
      if (typeof window !== "undefined") {
        setTimeout(() => {
          const redirectPath =
            userRole === "worker" || userRole === "business"
              ? "/onboarding" // Onboarding page will redirect based on profile existence
              : "/admin";
          console.log("[AUTH signIn] Redirecting to:", redirectPath);
          window.location.href = redirectPath;
        }, 800); // Increased delay to 800ms for better cookie persistence
      }
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error(t("auth.loginFailedGeneric"));
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserRole(null);
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
      toast.success(t("auth.logoutSuccess"));
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error(t("auth.logoutFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async (role: "worker" | "business" | "admin") => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
        },
      });

      if (error) {
        toast.error(t("auth.loginFailed", { message: error.message }));
      }
    } catch (error) {
      console.error("Google sign in error:", error);
      toast.error(t("auth.loginFailedGeneric"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        isLoading,
        signIn,
        signOut,
        signUp,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
