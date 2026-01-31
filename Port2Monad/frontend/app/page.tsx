import Link from 'next/link';
import { ArrowRight, GitBranch, Zap, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Navigation */}
      <nav className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Monad</span>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Launch Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="text-center">
          <div className="inline-block mb-6">
            <div className="px-4 py-2 rounded-full bg-muted border border-border">
              <p className="text-sm text-muted-foreground">
                AI-Powered Blockchain Migration System
              </p>
            </div>
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
            Migrate Smart Contracts with{' '} AI Intelligence
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
            Analyze, plan, transform, and validate your blockchain repositories
            using advanced AI-powered tools. Built for developers, by developers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              Start Migrating
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg border border-border hover:bg-muted/50 transition-colors font-medium"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Features */}
        <div
          id="features"
          className="grid md:grid-cols-3 gap-8 mt-24"
        >
          {[
            {
              icon: GitBranch,
              title: 'Repository Analysis',
              description: 'Automatically ingest and analyze blockchain repositories with full dependency tracking.',
            },
            {
              icon: Zap,
              title: 'Smart Transformation',
              description: 'AI-powered code transformation with confidence scoring and detailed migration reports.',
            },
            {
              icon: Shield,
              title: 'Validation & Explanation',
              description: 'Comprehensive validation pipeline with AI-generated explanations for all changes.',
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="p-6 rounded-lg border border-border bg-card hover:bg-card/80 transition-colors"
            >
              <feature.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 Monad. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Documentation
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                GitHub
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Status
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
