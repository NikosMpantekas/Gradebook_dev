import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, FileX } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { cn } from '../lib/utils';

const NotFound = () => {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHoveringButton, setIsHoveringButton] = useState(false);

  useEffect(() => {
    // Initial position on screen
    setMousePos({
      x: window.innerWidth * 0.9,
      y: window.innerHeight * 0.9,
    });

    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-zinc-950 text-zinc-100 relative overflow-hidden transition-colors duration-300">
      {/* Background dot grid */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#27272a 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Interactive cursor-following glow */}
      <div
        className={cn(
          "absolute w-[40%] h-[40%] rounded-full blur-[120px] z-0 pointer-events-none transition-all duration-500 ease-out bg-zinc-500 will-change-transform transform-gpu",
          isHoveringButton ? "opacity-0 scale-75" : "opacity-25 scale-100"
        )}
        style={{
          left: `${mousePos.x}px`,
          top: `${mousePos.y}px`,
          transform: "translate3d(-50%, -50%, 0)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 w-full p-6 flex justify-between items-center">
        <a
          href="/home"
          className="flex items-center gap-2 group no-underline hover:no-underline"
        >
          <img
            src="/logo-transparent.png"
            alt="GradeBook Logo"
            className="w-9 h-9 object-contain transition-transform group-hover:scale-105"
          />
          <span className="text-2xl font-serif font-bold tracking-tight text-white">
            GradeBook
          </span>
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-2xl">
          <Card className="bg-transparent border-none shadow-none overflow-hidden">
            <CardContent className="p-8 md:p-12 text-center space-y-8">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-3xl bg-zinc-500/10 text-zinc-400 flex items-center justify-center animate-[pulse_3s_ease-in-out_infinite]">
                  <FileX className="w-10 h-10" />
                </div>
              </div>

              {/* Message */}
              <div className="space-y-3">
                <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-tight text-white leading-tight">
                  404
                </h1>

                <p className="text-base md:text-lg max-w-lg mx-auto leading-relaxed text-zinc-400">
                  Η σελίδα που αναζητάτε δεν υπάρχει ή έχει μετακινηθεί.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  onClick={() => navigate('/')}
                  onMouseEnter={() => setIsHoveringButton(true)}
                  onMouseLeave={() => setIsHoveringButton(false)}
                  className="rounded-full px-8 h-12 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Αρχική Σελίδα
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate(-1)}
                  onMouseEnter={() => setIsHoveringButton(true)}
                  onMouseLeave={() => setIsHoveringButton(false)}
                  className="rounded-full px-8 h-12 text-base font-semibold border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300 bg-transparent transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Επιστροφή
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full p-6 text-center">
        <p className="text-xs text-zinc-600">
          © {new Date().getFullYear()} GradeBook
        </p>
      </footer>
    </div>
  );
};

export default NotFound;
