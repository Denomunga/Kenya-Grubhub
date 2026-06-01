import { useEffect, useRef } from 'react'
import { useTypingEffect } from '@/hooks/useTypingEffect'

export const HeroSection = () => {
  const typedText = useTypingEffect()
  const cloudsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!cloudsRef.current) return
      const scrollY = window.scrollY
      const clouds = cloudsRef.current.children
      Array.from(clouds).forEach((cloud, i) => {
        const el = cloud as HTMLElement
        el.style.transform = `translateY(${scrollY * 0.1 * (i + 1)}px)`
      })
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section className="relative h-screen flex items-center bg-linear-to-br from-dark-space to-space-navy text-white overflow-hidden">
      {/* Parallax Clouds */}
      <div ref={cloudsRef} className="absolute inset-0 pointer-events-none">
        <div className="absolute w-[400px] h-[400px] top-[10%] left-[5%] bg-white/10 rounded-full blur-[60px]" />
        <div className="absolute w-[300px] h-[300px] top-[50%] left-[20%] bg-white/10 rounded-full blur-[60px]" />
        <div className="absolute w-[250px] h-[250px] bottom-[10%] right-[10%] bg-white/20 rounded-full blur-[60px]" />
        <div className="absolute w-[200px] h-[200px] bottom-[30%] right-[30%] bg-white/10 rounded-full blur-[60px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate__animated animate__fadeInUp">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-8">
              RocketBoost is an all‑in‑one SaaS platform designed to EXPLODE your{' '}
              <span className="text-magenta relative">
                {typedText}
                <span className="inline-block w-[3px] h-[1em] bg-magenta animate-pulse ml-1" />
              </span>
            </h1>
            <div className="flex flex-wrap gap-4 mt-8">
              <a
                href="#signup"
                className="bg-magenta text-white font-bold py-3 px-8 rounded-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                FREE SIGN UP
              </a>
              <a
                href="#explore"
                className="border-2 border-white text-white font-bold py-3 px-8 rounded-full hover:bg-white hover:text-dark-space transition-all duration-300"
              >
                Explore Services
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="bg-gray-800 rounded-xl p-6 shadow-2xl">
              <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center text-gray-500">
                <span className="text-2xl">📺 Video Demo</span>
              </div>
            </div>
            <button className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-magenta rounded-full flex items-center justify-center animate-pulse-magenta shadow-lg">
              <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
