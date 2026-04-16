import React from 'react';
import { Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] animate-pulse" />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Pulsing Logo Container */}
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 2, -2, 0]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
          className="relative mb-8"
        >
          {/* Animated rings */}
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" style={{ animationDuration: '4.5s' }} />
          
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-600 shadow-2xl shadow-primary/40 ring-1 ring-white/20">
            <Activity className="h-10 w-10 text-white" />
          </div>
        </motion.div>

        {/* Loading Text */}
        <div className="text-center">
          <h2 className="text-xl font-black uppercase tracking-[0.3em] text-slate-800 dark:text-white mb-2">
            ClinicFlow
          </h2>
          <div className="flex items-center justify-center gap-1.5">
             <div className="h-1 w-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
             <div className="h-1 w-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '200ms' }} />
             <div className="h-1 w-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '400ms' }} />
          </div>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Optimizing Clinical Environment...
          </p>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-12 left-0 right-0 text-center opacity-30">
        <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-400">
          Clinical Grade Systems
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
