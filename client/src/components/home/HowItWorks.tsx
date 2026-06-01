const steps = [
  { 
    title: "Award Winning Processing", 
    desc: "Intelligent Payment Routing with industry-leading security and speed", 
    icon: "💳", 
    color: "text-magenta" 
  },
  { 
    title: "Chargeback 360", 
    desc: "Proprietary Fraud & Chargeback Prevention to protect your business", 
    icon: "🛡️", 
    color: "text-blue-600" 
  },
  { 
    title: "QuickPay", 
    desc: "Accelerated NET1 Payments for faster cash flow management", 
    icon: "💰", 
    color: "text-green-600" 
  },
]

export const HowItWorks = () => (
  <section className="py-20 bg-gray-50">
    <div className="container mx-auto px-4 text-center mb-16">
      <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">Take Your Business to New Heights</h2>
      <p className="text-gray-600 max-w-2xl mx-auto">
        Our comprehensive suite of tools and services designed to accelerate your growth
      </p>
    </div>
    <div className="relative max-w-4xl mx-auto">
      {/* Timeline line */}
      <div className="absolute left-1/2 -translate-x-1/2 h-full w-1 bg-linear-to-b from-magenta to-purple-800 hidden lg:block" />
      
      {steps.map((step, idx) => (
        <div key={idx} className={`flex flex-col lg:flex-row items-center mb-12 gap-8 ${idx % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}>
          {/* Icon Circle */}
          <div className="lg:w-1/2 flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center text-5xl border-4 border-magenta">
                {step.icon}
              </div>
              <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-magenta border-dashed opacity-50 animate-spin" style={{ animationDuration: '20s' }} />
            </div>
          </div>

          {/* Content Card */}
          <div className="lg:w-1/2">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <h4 className="text-2xl font-bold mb-3 font-heading">{step.title}</h4>
              <p className="text-gray-600 mb-6 leading-relaxed text-lg">{step.desc}</p>
              <a 
                href="#" 
                className="inline-block border-2 border-gray-300 text-gray-700 font-semibold py-2 px-8 rounded-full hover:bg-magenta hover:text-white hover:border-magenta transition-all"
              >
                LEARN MORE
              </a>
            </div>
          </div>
        </div>
      ))}

      {/* Floating Rocket */}
      <div className="text-center mt-16 animate-fly-rocket">
        <svg viewBox="0 0 100 100" className="w-20 h-20 mx-auto fill-magenta">
          <path d="M50 0 L60 30 L80 40 L60 50 L50 80 L40 50 L20 40 L40 30 Z" />
          <circle cx="50" cy="40" r="8" fill="white" />
        </svg>
      </div>
    </div>
  </section>
)

export default HowItWorks
