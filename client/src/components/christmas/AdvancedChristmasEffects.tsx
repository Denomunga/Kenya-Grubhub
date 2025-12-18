import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Music, Sun, Moon, TreePine, Sparkles } from 'lucide-react';
import { Star } from '@/components/ui/Star';

interface SnowParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  wind: number;
  opacity: number;
  type: 'snowflake' | 'star' | 'sparkle';
}

interface ChristmasLight {
  id: number;
  x: number;
  y: number;
  color: string;
  delay: number;
}

interface GiftBox {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
}

interface Decoration {
  id: number;
  x: number;
  y: number;
  type: 'ornament' | 'star' | 'candy';
  color: string;
}

export function AdvancedChristmasEffects() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isDayTime, setIsDayTime] = useState(true);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [decorations, setDecorations] = useState<Decoration[]>([]);
  const [timeUntilChristmas, setTimeUntilChristmas] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const audioRef = useRef<HTMLAudioElement>(null);

  // Mouse tracking for interactive snow
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Day/Night cycle
  useEffect(() => {
    const hour = new Date().getHours();
    setIsDayTime(hour >= 6 && hour < 18);
    
    const interval = setInterval(() => {
      const currentHour = new Date().getHours();
      setIsDayTime(currentHour >= 6 && currentHour < 18);
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  // Christmas countdown
  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const christmas = new Date(currentYear, 11, 25); // December 25th
      
      // If Christmas has passed this year, calculate for next year
      if (now > christmas) {
        christmas.setFullYear(currentYear + 1);
      }
      
      const difference = christmas.getTime() - now.getTime();
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setTimeUntilChristmas({ days, hours, minutes, seconds });
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Interactive snow particles
  const snowParticles = useMemo(() => {
    const particles: SnowParticle[] = [];
    const types: ('snowflake' | 'star' | 'sparkle')[] = ['snowflake', 'star', 'sparkle'];
    
    for (let i = 0; i < 150; i++) {
      particles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight - window.innerHeight,
        size: Math.random() * 4 + 1,
        speed: Math.random() * 2 + 0.5,
        wind: Math.random() * 2 - 1,
        opacity: Math.random() * 0.8 + 0.2,
        type: types[Math.floor(Math.random() * types.length)]
      });
    }
    return particles;
  }, []);

  // Christmas lights garland
  const christmasLights = useMemo(() => {
    const lights: ChristmasLight[] = [];
    const colors = ['#ff0000', '#00ff00', '#ffff00', '#ff00ff', '#00ffff', '#ffa500'];
    
    for (let i = 0; i < 50; i++) {
      lights.push({
        id: i,
        x: (i / 50) * window.innerWidth,
        y: 50,
        color: colors[i % colors.length],
        delay: i * 0.1
      });
    }
    return lights;
  }, []);

  // Animated gift boxes
  const giftBoxes = useMemo(() => {
    const boxes: GiftBox[] = [];
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b'];
    
    for (let i = 0; i < 8; i++) {
      boxes.push({
        id: i,
        x: Math.random() * (window.innerWidth - 100) + 50,
        y: Math.random() * (window.innerHeight - 200) + 100,
        color: colors[i % colors.length],
        size: Math.random() * 30 + 40,
        rotation: Math.random() * 360
      });
    }
    return boxes;
  }, []);

  // Add decoration on click
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const types: ('ornament' | 'star' | 'candy')[] = ['ornament', 'star', 'candy'];
    const colors = ['#ff0000', '#00ff00', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4'];
    
    const newDecoration: Decoration = {
      id: Date.now(),
      x,
      y,
      type: types[Math.floor(Math.random() * types.length)],
      color: colors[Math.floor(Math.random() * colors.length)]
    };
    
    setDecorations(prev => [...prev, newDecoration]);
  }, []);

  // Music toggle
  const toggleMusic = useCallback(() => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
      setIsMusicPlaying(!isMusicPlaying);
    }
  }, [isMusicPlaying]);

  // Clear decorations
  const clearDecorations = useCallback(() => {
    setDecorations([]);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-10" onClick={handleCanvasClick}>
      {/* Sky gradient based on time */}
      <motion.div
        className="absolute inset-0 transition-all duration-3000"
        animate={{
          background: isDayTime
            ? 'linear-gradient(to bottom, #87CEEB 0%, #E0F6FF 50%, #FFF4E6 100%)'
            : 'linear-gradient(to bottom, #0c1445 0%, #1e3c72 50%, #2a5298 100%)'
        }}
      />

      {/* Interactive Snow Particles */}
      <AnimatePresence>
        {snowParticles.map((particle) => {
          const distanceFromMouse = Math.sqrt(
            Math.pow(mousePosition.x - particle.x, 2) + 
            Math.pow(mousePosition.y - particle.y, 2)
          );
          const mouseEffect = distanceFromMouse < 100 ? 1.5 : 1;
          
          return (
            <motion.div
              key={particle.id}
              className="absolute pointer-events-none"
              initial={{ 
                x: particle.x, 
                y: particle.y - window.innerHeight,
                opacity: 0 
              }}
              animate={{
                x: particle.x + Math.sin(Date.now() / 1000 + particle.id) * particle.wind * mouseEffect,
                y: particle.y + window.innerHeight + 100,
                opacity: particle.opacity,
                rotate: particle.type === 'snowflake' ? 360 : 0,
                scale: mouseEffect
              }}
              transition={{
                duration: particle.speed * 10,
                repeat: Infinity,
                ease: "linear",
                rotate: { duration: 3, repeat: Infinity, ease: "linear" }
              }}
              style={{
                width: particle.size * mouseEffect,
                height: particle.size * mouseEffect,
              }}
            >
              {particle.type === 'snowflake' && (
                <div className="w-full h-full bg-white rounded-full shadow-sm shadow-white/50" />
              )}
              {particle.type === 'star' && (
                <Sparkles className="w-full h-full text-yellow-300" />
              )}
              {particle.type === 'sparkle' && (
                <div className="w-full h-full bg-blue-300 rounded-full animate-pulse" />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Christmas Lights Garland */}
      <div className="absolute top-0 left-0 right-0 h-20 pointer-events-none">
        {christmasLights.map((light) => (
          <motion.div
            key={light.id}
            className="absolute w-4 h-4 rounded-full"
            style={{
              left: light.x,
              top: light.y,
              backgroundColor: light.color,
              boxShadow: `0 0 10px ${light.color}`
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: light.delay,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* 3D Rotating Christmas Tree */}
      <motion.div
        className="absolute top-20 left-10 pointer-events-none"
        animate={{
          rotateY: [0, 360]
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <TreePine className="w-24 h-24 text-green-600 drop-shadow-2xl" />
            <div className="absolute top-0 left-0 w-full h-full">
              {christmasLights.slice(0, 10).map((light, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: light.color,
                    top: `${20 + i * 8}px`,
                    left: `${50 + (i % 2 === 0 ? -20 : 20)}px`,
                    boxShadow: `0 0 8px ${light.color}`
                  }}
                  animate={{
                    opacity: [0.5, 1, 0.5],
                    scale: [0.8, 1.2, 0.8]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Animated Gift Boxes */}
          {giftBoxes.map((box) => (
            <motion.div
              key={box.id}
              className="absolute pointer-events-none"
              style={{
                left: box.x,
                top: box.y,
                width: box.size,
                height: box.size
              }}
              animate={{
                y: [0, -10, 0],
                rotate: box.rotation,
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: box.id * 0.5,
                ease: "easeInOut"
              }}
            >
              <Gift 
                className="w-full h-full drop-shadow-lg"
                style={{ color: box.color }}
              />
            </motion.div>
          ))}

          {/* Interactive Decorations */}
          {decorations.map((decoration) => (
            <motion.div
              key={decoration.id}
              className="absolute pointer-events-none"
              style={{
                left: decoration.x - 15,
                top: decoration.y - 15,
                color: decoration.color
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.2 }}
            >
              {decoration.type === 'ornament' && (
                <div className="w-8 h-8 rounded-full border-2 border-current bg-current/20" />
              )}
              {decoration.type === 'star' && (
                <Star className="w-8 h-8" fill={true} />
              )}
              {decoration.type === 'candy' && (
                <div className="w-8 h-8 rounded-full bg-current" />
              )}
            </motion.div>
          ))}

          {/* Christmas Countdown */}
          <motion.div
            className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/20 pointer-events-auto"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <div className="text-center">
              <h3 className="text-sm font-bold text-gray-800 mb-2">Christmas Countdown</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <motion.div
                    className="text-2xl font-bold text-red-600"
                    key={timeUntilChristmas.days}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                  >
                    {timeUntilChristmas.days}
                  </motion.div>
                  <div className="text-xs text-gray-600">Days</div>
                </div>
                <div>
                  <motion.div
                    className="text-2xl font-bold text-blue-600"
                    key={timeUntilChristmas.hours}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                  >
                    {timeUntilChristmas.hours}
                  </motion.div>
                  <div className="text-xs text-gray-600">Hours</div>
                </div>
                <div>
                  <motion.div
                    className="text-2xl font-bold text-blue-700"
                    key={timeUntilChristmas.minutes}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                  >
                    {timeUntilChristmas.minutes}
                  </motion.div>
                  <div className="text-xs text-gray-600">Mins</div>
                </div>
                <div>
                  <motion.div
                    className="text-2xl font-bold text-blue-800"
                    key={timeUntilChristmas.seconds}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                  >
                    {timeUntilChristmas.seconds}
                  </motion.div>
                  <div className="text-xs text-gray-600">Secs</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Music Toggle */}
          <motion.button
            className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-xl border border-white/20 pointer-events-auto"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleMusic}
          >
            <Music className={`w-6 h-6 ${isMusicPlaying ? 'text-blue-600' : 'text-gray-600'}`} />
          </motion.button>

          {/* Day/Night Toggle Display */}
          <motion.button
            className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-xl border border-white/20 pointer-events-auto"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsDayTime(!isDayTime)}
          >
            {isDayTime ? (
              <Sun className="w-6 h-6 text-yellow-500" />
            ) : (
              <Moon className="w-6 h-6 text-blue-600" />
            )}
          </motion.button>

          {/* Clear Decorations Button */}
          {decorations.length > 0 && (
            <motion.button
              className="fixed top-0 left-0 w-full h-full bg-blue-600 rounded-full blur-3xl py-2 shadow-xl border border-white/20 text-sm pointer-events-auto"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={clearDecorations}
            >
              Clear Decorations ({decorations.length})
            </motion.button>
          )}

          {/* Instructions */}
          <motion.div
            className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-xl border border-white/20 pointer-events-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2 }}
          >
            <p className="text-sm text-gray-700">🎄 Click anywhere to add decorations!</p>
          </motion.div>

          {/* Hidden Audio Element */}
          <audio
            ref={audioRef}
            loop
            src="/christmas-music.mp3"
            preload="auto"
          />
        </div>
      );
    }
