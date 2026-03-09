"use client"

import { useTranslation } from "@/lib/i18n/hooks"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function HomePage() {
  const { t } = useTranslation()

  const handleLoginClick = () => {
    window.location.href = "/login"
  }

  const handleRegisterClick = () => {
    window.location.href = "/register"
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            {t('landing.title')}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t('landing.tagline')}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <Button
            variant="default"
            size="lg"
            fullWidth
            onClick={handleLoginClick}
          >
            {t('landing.loginButton')}
          </Button>
          <Button
            variant="outline"
            size="lg"
            fullWidth
            onClick={handleRegisterClick}
          >
            {t('landing.registerButton')}
          </Button>
        </div>

        {/* Project Status Card */}
        <Card className="border border-border bg-card">
          <CardContent className="pt-4">
            <p className="font-medium text-foreground mb-3">
              {t('landing.projectStatus')}
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                {t('landing.phase1')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                {t('landing.phase2')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-500">⏳</span>
                {t('landing.phase3')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-500">⏳</span>
                {t('landing.phase4')}
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
