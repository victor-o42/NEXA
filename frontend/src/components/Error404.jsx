import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function Error404() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--c-bg)] relative overflow-hidden p-6">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full" 
           style={{ background: 'radial-gradient(circle, rgba(0,242,254,0.05) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      {/* The AI Eye Core */}
      <div className="relative flex items-center justify-center mb-12">
        {/* Outer Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute w-48 h-48 rounded-full border border-dashed border-[var(--c-cyan)] opacity-20"
        />
        
        {/* Middle Ring */}
        <motion.div
          animate={{ rotate: -360, scale: [1, 1.05, 1] }}
          transition={{ 
            rotate: { duration: 15, repeat: Infinity, ease: "linear" },
            scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute w-36 h-36 rounded-full border-2 border-[var(--c-purple)] opacity-30"
          style={{ borderTopColor: 'transparent', borderBottomColor: 'transparent' }}
        />

        {/* Inner Core (The Eye) */}
        <motion.div
          animate={{ scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 rounded-full relative z-10 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, var(--c-cyan) 0%, var(--c-purple) 100%)',
            boxShadow: '0 0 30px rgba(0, 242, 254, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.8)'
          }}
        >
          {/* Pupil */}
          <motion.div 
            animate={{ scale: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-4 h-4 bg-[var(--c-bg)] rounded-full"
          />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center z-10 max-w-md"
      >
        <h1 className="text-6xl font-black tracking-tighter mb-4 text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, var(--c-cyan), var(--c-purple))' }}>
          404
        </h1>
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--c-text-primary)' }}>
          Page Not Found
        </h2>
        <p className="text-base mb-8" style={{ color: 'var(--c-text-secondary)' }}>
          The page or resource you are looking for does not exist or has been moved.
        </p>

        <motion.button
          onClick={() => navigate('/')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-4 rounded-2xl font-bold text-sm tracking-wider shadow-lg"
          style={{ 
            background: 'linear-gradient(135deg, var(--c-surface-2) 0%, var(--c-surface-3) 100%)', 
            color: 'var(--c-text-primary)',
            border: '1px solid var(--c-border)'
          }}
        >
          &larr; RETURN HOME
        </motion.button>
      </motion.div>
    </div>
  );
}
