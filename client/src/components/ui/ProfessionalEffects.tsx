import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Glass Morphism Card Component
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  opacity?: number;
  border?: boolean;
  shadow?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function GlassCard({ 
  children, 
  className, 
  blur = 'md', 
  opacity = 0.1,
  shadow = 'lg'
}: GlassCardProps) {
  const blurMap = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl'
  };

  const shadowMap = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl'
  };

  return (
    <motion.div
      className={cn(
        'rounded-2xl bg-white/10 border border-white/20',
        blurMap[blur],
        shadowMap[shadow],
        className
      )}
      style={{ backgroundColor: `rgba(255, 255, 255, ${opacity})` }}
      whileHover={{ 
        scale: 1.02,
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.2), 0 10px 20px -5px rgba(0, 0, 0, 0.1)'
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {children}
    </motion.div>
  );
}

// Magnetic Button Component
interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  magnetStrength?: number;
}

export function MagneticButton({ 
  children, 
  className, 
  onClick, 
  disabled = false,
  magnetStrength = 0.3
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current || disabled) return;

    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    setMousePosition({ x: x * magnetStrength, y: y * magnetStrength });
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 });
  };

  return (
    <motion.button
      ref={ref}
      className={cn(
        'relative px-6 py-3 bg-linear-to-r from-primary to-secondary text-white rounded-xl font-medium shadow-lg',
        'hover:shadow-xl transition-all duration-300',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      animate={{
        x: mousePosition.x,
        y: mousePosition.y
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {children}
    </motion.button>
  );
}

// 3D Tilt Card Component
interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  scale?: number;
}

export function TiltCard({ children, className, maxTilt = 15, scale = 1.05 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0, scale: 1 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    setTransform({ rotateX, rotateY, scale });
  };

  const handleMouseLeave = () => {
    setTransform({ rotateX: 0, rotateY: 0, scale: 1 });
  };

  return (
    <motion.div
      ref={ref}
      className={cn('relative transform-gpu transition-transform duration-200', className)}
      style={{
        transform: `perspective(1000px) rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg) scale(${transform.scale})`
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
}

// Animated Text Effects
interface AnimatedTextProps {
  text: string;
  className?: string;
  type?: 'typewriter' | 'glitch' | 'glow' | 'wave';
  delay?: number;
}

export function AnimatedText({ text, className, type = 'typewriter' }: AnimatedTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (type === 'typewriter') {
      if (currentIndex < text.length) {
        const timeout = setTimeout(() => {
          setDisplayText(prev => prev + text[currentIndex]);
          setCurrentIndex(prev => prev + 1);
        }, 100);
        return () => clearTimeout(timeout);
      }
    } else {
      setDisplayText(text);
    }
  }, [currentIndex, text, type]);

  if (type === 'typewriter') {
    return (
      <span className={className}>
        {displayText}
        <motion.span
          className="inline-block w-0.5 h-5 bg-current ml-1"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      </span>
    );
  }

  if (type === 'glitch') {
    return (
      <motion.span
        className={cn('relative', className)}
        animate={{
          textShadow: [
            '2px 2px 0 #ff0000, -2px -2px 0 #00ffff',
            '-2px 2px 0 #ff0000, 2px -2px 0 #00ffff',
            '2px -2px 0 #ff0000, -2px 2px 0 #00ffff',
            '-2px -2px 0 #ff0000, 2px 2px 0 #00ffff'
          ]
        }}
        transition={{ duration: 0.2, repeat: Infinity }}
      >
        {text}
      </motion.span>
    );
  }

  if (type === 'glow') {
    return (
      <motion.span
        className={cn('relative', className)}
        animate={{
          textShadow: [
            '0 0 10px rgba(59, 130, 246, 0.5)',
            '0 0 20px rgba(59, 130, 246, 0.8)',
            '0 0 30px rgba(59, 130, 246, 1)',
            '0 0 20px rgba(59, 130, 246, 0.8)',
            '0 0 10px rgba(59, 130, 246, 0.5)'
          ]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {text}
      </motion.span>
    );
  }

  if (type === 'wave') {
    return (
      <span className={className}>
        {text.split('').map((char, index) => (
          <motion.span
            key={index}
            initial={{ y: 0 }}
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: index * 0.1,
              ease: "easeInOut"
            }}
          >
            {char}
          </motion.span>
        ))}
      </span>
    );
  }

  return <span className={className}>{text}</span>;
}

// Gradient Border Component
interface GradientBorderProps {
  children: React.ReactNode;
  className?: string;
  gradient?: string;
  borderWidth?: number;
  borderRadius?: number;
}

export function GradientBorder({ 
  children, 
  className, 
  gradient = 'linear-gradient(45deg, #3b82f6 0%, #1e40af 100%)',
  borderWidth = 2,
  borderRadius = 12
}: GradientBorderProps) {
  return (
    <div
      className={cn('relative p-1', className)}
      style={{
        background: gradient,
        borderRadius: `${borderRadius}px`
      }}
    >
      <div
        className="w-full h-full"
        style={{
          borderRadius: `${borderRadius - borderWidth}px`
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Floating Action Button with Advanced Effects
interface FloatingActionButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  badge?: number;
}

export function FloatingActionButton({ 
  icon, 
  onClick, 
  className, 
  position = 'bottom-right',
  badge
}: FloatingActionButtonProps) {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  return (
    <motion.div
      className={cn('fixed z-50', positionClasses[position])}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <motion.button
        className={cn(
          `w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center font-bold text-lg hover:shadow-2xl transition-shadow duration-300`,
          'flex items-center justify-center',
          className
        )}
        onClick={onClick}
        whileHover={{ scale: 1.1, rotate: 15 }}
        whileTap={{ scale: 0.9 }}
      >
        {icon}
        
        {badge && badge > 0 && (
          <motion.div
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-bold"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            {badge > 99 ? '99+' : badge}
          </motion.div>
        )}
        
        {/* Ripple Effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-white opacity-0"
          whileTap={{
            opacity: 0.3,
            scale: 1.5
          }}
          transition={{ duration: 0.3 }}
        />
      </motion.button>
    </motion.div>
  );
}

// Advanced Hover Card
interface HoverCardProps {
  children: React.ReactNode;
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  className?: string;
}

export function HoverCard({ frontContent, backContent, className }: HoverCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <motion.div
      className={cn('relative w-full h-64', className)}
      style={{ perspective: '1000px' }}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <motion.div
        className="absolute inset-0 w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Front */}
        <motion.div
          className={`relative overflow-hidden rounded-xl shadow-xl transition-all duration-300 card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {frontContent}
        </motion.div>
        
        {/* Back */}
        <motion.div
          className="absolute inset-0 bg-blue-50 backdrop-blur-sm rounded-2xl border border-blue-200"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          {backContent}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// Particle Background Effect
interface ParticleBackgroundProps {
  particleCount?: number;
  className?: string;
}

export function ParticleBackground({ particleCount = 50, className }: ParticleBackgroundProps) {
  const particles = Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1,
    duration: Math.random() * 20 + 10
  }));

  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute bg-white rounded-full opacity-50"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, particle.size * 10, 0],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: particle.id * 0.1
          }}
        />
      ))}
    </div>
  );
}

// Smooth Color Transition Component
interface ColorTransitionProps {
  colors: string[];
  duration?: number;
  className?: string;
}

export function ColorTransition({ colors, duration = 3, className }: ColorTransitionProps) {
  const [currentColorIndex, setCurrentColorIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentColorIndex((prev) => (prev + 1) % colors.length);
    }, duration * 1000);

    return () => clearInterval(interval);
  }, [colors.length, duration]);

  return (
    <motion.div
      className={className}
      animate={{ backgroundColor: colors[currentColorIndex] }}
      transition={{ duration: 1 }}
    />
  );
}
