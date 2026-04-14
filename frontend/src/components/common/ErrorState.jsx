import React from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Terminal
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

/**
 * PREMIUM REUSABLE ERROR STATE
 * A component for inline errors that maintains the app's visual excellence.
 * Aligned with the Maintenance page aesthetic.
 */
const ErrorState = ({ 
  message = "Προέκυψε ένα σφάλμα κατά την επεξεργασία", 
  fullPage = false, 
  onRetry = null,
  retryText = "Δοκιμασε Ξανα"
}) => {
  const content = (
    <div className={`flex flex-col justify-center items-center p-12 w-full text-center space-y-8 ${
      fullPage ? 'min-h-[70vh] bg-zinc-950 text-zinc-100' : 'min-h-[300px]'
    }`}>
      {/* Background dot grid if full page */}
      {fullPage && (
        <div className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#27272a 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />
      )}

      <div className="relative z-10">
        <div className="absolute inset-0 bg-red-500/10 rounded-full blur-2xl animate-pulse" />
        <div className="relative w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center shadow-lg">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
      </div>

      <div className="space-y-3 relative z-10">
        <Badge variant="outline" className="px-3 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold border-red-500/30 text-red-400 bg-red-500/5">
          Σφάλμα Μονάδας
        </Badge>
        <h3 className="text-2xl font-serif font-bold tracking-tight text-white">
          Πρόβλημα Συγχρονισμού
        </h3>
        <p className="text-zinc-400 font-medium max-w-sm mx-auto leading-relaxed">
          {message}
        </p>
        <p className="text-[11px] text-zinc-500 max-w-xs mx-auto pt-2">
          Η ομάδα μας πιθανότατα ήδη δουλεύει για την επίλυση αυτού του προβλήματος
        </p>
      </div>

      {onRetry && (
        <Button 
          variant="default" 
          onClick={onRetry}
          className="relative z-10 h-12 px-8 rounded-full font-bold transition-all hover:scale-105"
        >
          <RefreshCw className="mr-3 h-4 w-4" />
          {retryText}
        </Button>
      )}

      <div className="relative z-10 w-full max-w-xs bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center space-x-3 text-left">
        <Terminal className="w-4 h-4 text-zinc-600" />
        <span className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase truncate">Status: Async_Fail</span>
      </div>
    </div>
  );

  if (fullPage) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center overflow-hidden">{content}</div>;

  return (
    <Card className="rounded-[2.5rem] overflow-hidden border-zinc-800 bg-zinc-900/50 backdrop-blur-sm shadow-2xl relative">
      <div className="h-1 bg-gradient-to-r from-red-500 to-orange-500 opacity-50" />
      <CardContent className="p-0">
        {content}
      </CardContent>
    </Card>
  );
};

export default ErrorState;
