const solutions = [
  {
    title: "E-Commerce Solutions",
    desc: "Complete platform for online businesses with inventory, orders, and customer management.",
    icon: "🛒",
    features: ["Product Catalog", "Order Management", "Inventory Tracking"],
  },
  {
    title: "Payment Processing",
    desc: "Secure and fast payment gateway supporting multiple payment methods.",
    icon: "💰",
    features: ["Multiple Payment Methods", "Fraud Detection", "Instant Settlements"],
  },
  {
    title: "Marketing Automation",
    desc: "Powerful tools to automate your marketing campaigns and reach more customers.",
    icon: "📧",
    features: ["Email Campaigns", "Analytics", "Customer Segmentation"],
  },
  {
    title: "Customer Support",
    desc: "24/7 support to help your customers with their queries and concerns.",
    icon: "💬",
    features: ["Live Chat", "Ticketing System", "Knowledge Base"],
  },
]

export const Solutions = () => (
  <section className="py-20 bg-white">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">Complete Solutions</h2>
        <p className="text-gray-600 max-w-2xl mx-auto text-lg">
          Everything you need to run and grow your business
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {solutions.map((solution, idx) => (
          <div 
            key={idx} 
            className="p-6 bg-linear-to-br from-gray-50 to-white rounded-xl border border-gray-200 hover:border-magenta hover:shadow-lg transition-all duration-300 group"
          >
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{solution.icon}</div>
            <h3 className="text-xl font-bold mb-3 font-heading group-hover:text-magenta transition-colors">{solution.title}</h3>
            <p className="text-gray-600 mb-4 text-sm leading-relaxed">{solution.desc}</p>
            <ul className="space-y-2 mb-6">
              {solution.features.map((feature, i) => (
                <li key={i} className="flex items-center text-sm text-gray-700">
                  <span className="w-2 h-2 bg-magenta rounded-full mr-2" />
                  {feature}
                </li>
              ))}
            </ul>
            <a href="#" className="text-magenta font-semibold text-sm hover:underline">
              Explore →
            </a>
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default Solutions
