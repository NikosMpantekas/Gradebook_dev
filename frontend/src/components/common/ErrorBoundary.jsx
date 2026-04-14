import React from 'react';
import { 
  AlertTriangle, 
  Home, 
  RefreshCw, 
  ArrowRight,
  GraduationCap,
  Bug,
  ChevronDown,
  Terminal
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { cn } from '../../lib/utils';

/**
 * REFINED ERROR BOUNDARY
 * Aligned with the GradeBook maintenance page aesthetic.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      isExploded: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 ERROR BOUNDARY:', { error, errorInfo });
    this.setState({ error, errorInfo });
    setTimeout(() => this.setState({ isExploded: true }), 100);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col font-sans bg-zinc-950 text-zinc-100 relative overflow-hidden transition-colors duration-300">
          {/* Background dot grid */}
          <div className="absolute inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(#27272a 1px, transparent 1px)`,
              backgroundSize: '32px 32px'
            }}
          />

          {/* Ambient glow */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-500 rounded-full opacity-10 blur-[120px] z-0" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-500 rounded-full opacity-10 blur-[120px] z-0" />

          {/* Header */}
          <header className="relative z-10 w-full p-6 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="text-2xl font-serif font-bold tracking-tight text-white">
                GradeBook
              </span>
            </div>
          </header>

          <main className="flex-1 flex items-center justify-center p-4 relative z-10">
            <div className={cn(
              "w-full max-w-2xl transition-all duration-700 transform",
              this.state.isExploded ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-8"
            )}>
              <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm shadow-2xl overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-red-500 via-red-400 to-orange-500" />
                
                <CardContent className="p-8 md:p-12 text-center space-y-8">
                  {/* Icon */}
                  <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center animate-pulse">
                      <Bug className="w-10 h-10" />
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-3">
                    <Badge variant="outline" className="px-3 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold border-red-500/50 text-red-400 bg-red-500/5">
                      Σφάλμα Συστήματος
                    </Badge>

                    <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-tight text-white leading-tight">
                      Παρουσιάστηκε πρόβλημα
                    </h1>

                    <p className="text-base md:text-lg max-w-lg mx-auto leading-relaxed text-zinc-400 italic">
                      "{this.state.error?.message || 'Η εφαρμογή αντιμετώπισε ένα πρόβλημα κατά την εμφάνιση αυτού του στοιχείου.'}"
                    </p>

                    <p className="text-sm text-zinc-500 max-w-md mx-auto">
                      Η ομάδα μας πιθανότατα ήδη δουλεύει για την επίλυση αυτού του προβλήματος
                    </p>
                  </div>

                  {/* CTA Buttons */}
                  <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      size="lg"
                      onClick={() => window.location.reload()}
                      className="rounded-full px-8 h-12 text-base font-semibold group"
                    >
                      <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-700" />
                      Δοκιμάστε Ξανά
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => window.location.href = '/'}
                      className="rounded-full px-8 h-12 text-base font-semibold border-zinc-700 hover:bg-zinc-800"
                    >
                      Αρχική Σελίδα
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>

                  {/* Diagnostics */}
                  <div className="pt-6 border-t border-zinc-800/50">
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center space-x-2 mx-auto text-[10px] uppercase tracking-widest font-bold text-zinc-500 hover:text-zinc-300 transition-colors">
                        <Terminal className="w-3 h-3" />
                        <span>Τεχνικά Στοιχεία</span>
                        <ChevronDown className="w-3 h-3" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4 text-left">
                        <pre className="text-[10px] text-zinc-500 leading-relaxed font-mono p-4 bg-black/30 rounded-xl overflow-auto max-h-48 border border-zinc-800">
                          {this.state.errorInfo?.componentStack}
                        </pre>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>

          <footer className="relative z-10 w-full p-6 text-center">
            <p className="text-xs text-zinc-600">
              © {new Date().getFullYear()} GradeBook
            </p>
          </footer>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
