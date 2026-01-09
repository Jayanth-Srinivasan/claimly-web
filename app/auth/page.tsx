"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoginForm } from "@/components/auth/login-form"
import { SignUpForm } from "@/components/auth/signup-form"
import { MessageSquare, ArrowLeft } from "lucide-react"

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login")

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black p-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-8 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <Card className="p-8 bg-white dark:bg-black border-black/10 dark:border-white/10">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-lg bg-black dark:bg-white flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-white dark:text-black" />
            </div>
            <span className="text-2xl font-semibold text-black dark:text-white">
              Claimly
            </span>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-black dark:text-white">Welcome back</h2>
                  <p className="text-black/60 dark:text-white/60 text-sm mt-1">
                    Sign in to your account to continue
                  </p>
                </div>
                <LoginForm />
              </div>
            </TabsContent>

            <TabsContent value="signup">
              <div className="space-y-4">
                <SignUpForm />
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
