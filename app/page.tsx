import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Sparkles,
  MessageSquare,
  Plane,
  Shield,
  Luggage,
} from "lucide-react"

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black overflow-hidden">
      <section className="container relative">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-black px-4 py-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-black dark:text-white" />
            <span className="font-medium text-black dark:text-white">AI-Powered Travel Insurance Assistant</span>
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl text-black dark:text-white">
            Claimly
          </h1>

          <p className="mb-10 text-xl text-black/60 dark:text-white/60 md:text-2xl max-w-2xl mx-auto">
            Your all-in-one chatbot for P&C insurance claims. Streamline travel insurance
            claims processing with intelligent automation and instant support.
          </p>

          <div className="flex items-center justify-center mb-16">
            <Link href="/auth">
              <Button
                size="lg"
                className="bg-black hover:bg-black/90 dark:bg-white dark:hover:bg-white/90 text-white dark:text-black px-8 h-12 text-lg font-medium"
              >
                Get Started
              </Button>
            </Link>
          </div>

          {/* Floating Preview Cards */}
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute -top-4 left-0 w-72 opacity-60 animate-float">
              <Card className="p-4 bg-white dark:bg-black border-black/10 dark:border-white/10">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-black dark:bg-white flex items-center justify-center shrink-0">
                    <Plane className="h-4 w-4 text-white dark:text-black" />
                  </div>
                  <div className="text-sm text-left">
                    <p className="font-medium text-black dark:text-white">Flight delayed 6 hours?</p>
                    <p className="text-black/60 dark:text-white/60 text-xs mt-1">File your claim instantly...</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="absolute -bottom-4 right-0 w-72 opacity-60 animate-float-delayed">
              <Card className="p-4 bg-white dark:bg-black border-black/10 dark:border-white/10">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-black dark:bg-white flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-white dark:text-black" />
                  </div>
                  <div className="text-sm text-left">
                    <p className="font-medium text-black dark:text-white">Claim approved: $1,250</p>
                    <p className="text-black/60 dark:text-white/60 text-xs mt-1">Processing reimbursement...</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="absolute top-20 right-12 w-64 opacity-60 animate-float">
              <Card className="p-4 bg-white dark:bg-black border-black/10 dark:border-white/10">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-black dark:bg-white flex items-center justify-center shrink-0">
                    <Luggage className="h-4 w-4 text-white dark:text-black" />
                  </div>
                  <div className="text-sm text-left">
                    <p className="font-medium text-black dark:text-white">Lost baggage claim</p>
                    <p className="text-black/60 dark:text-white/60 text-xs mt-1">Track your luggage status...</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="absolute bottom-20 left-12 w-64 opacity-60 animate-float-delayed">
              <Card className="p-4 bg-white dark:bg-black border-black/10 dark:border-white/10">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-black dark:bg-white flex items-center justify-center shrink-0">
                    <MessageSquare className="h-4 w-4 text-white dark:text-black" />
                  </div>
                  <div className="text-sm text-left">
                    <p className="font-medium text-black dark:text-white">Need help with a claim?</p>
                    <p className="text-black/60 dark:text-white/60 text-xs mt-1">24/7 AI support available...</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
