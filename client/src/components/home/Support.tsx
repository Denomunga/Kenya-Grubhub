const supportItems = [
  {
    title: "Expert Guidance",
    desc: "Our team of experts is ready to guide you through every step of your business journey.",
    icon: "👨‍💼",
  },
  {
    title: "Technical Support",
    desc: "Get help with technical issues and integration with our comprehensive documentation.",
    icon: "🔧",
  },
  {
    title: "Community Forum",
    desc: "Join thousands of entrepreneurs and share knowledge in our active community.",
    icon: "👥",
  },
  {
    title: "Training Resources",
    desc: "Access tutorials, webinars, and courses to master every feature of our platform.",
    icon: "📚",
  },
]

export const Support = () => (
  <section className="py-20 bg-linear-to-b from-dark-space to-space-navy text-white">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">We're Here to Support You</h2>
        <p className="text-gray-300 max-w-2xl mx-auto text-lg">
          Comprehensive support to ensure your success on our platform
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        {supportItems.map((item, idx) => (
          <div 
            key={idx} 
            className="p-8 bg-white/5 backdrop-blur rounded-xl border border-white/10 hover:border-magenta hover:bg-magenta/5 transition-all duration-300 group"
          >
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{item.icon}</div>
            <h3 className="text-xl font-bold mb-3 font-heading group-hover:text-magenta transition-colors">{item.title}</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">{item.desc}</p>
            <a href="#" className="text-magenta font-semibold text-sm hover:underline inline-block">
              Learn more →
            </a>
          </div>
        ))}
      </div>

      <div className="text-center">
        <h3 className="text-2xl font-bold mb-6 font-heading">Get Started Today</h3>
        <a
          href="#signup"
          className="inline-block bg-magenta text-white font-bold py-4 px-12 rounded-full hover:shadow-2xl hover:shadow-magenta/50 hover:-translate-y-1 transition-all duration-300"
        >
          Start Your Free Trial
        </a>
        <p className="text-gray-400 mt-4">No credit card required. 14-day free trial.</p>
      </div>
    </div>
  </section>
)

export default Support
