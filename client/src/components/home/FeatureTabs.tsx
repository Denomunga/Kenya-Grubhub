import { useState } from 'react'

const features = [
  {
    id: 'affiliates',
    icon: '👥',
    title: 'Affiliates',
    desc: 'Earn up to 75% commissions and grow your passive income stream with our affiliate program.',
  },
  {
    id: 'vendors',
    icon: '🏪',
    title: 'Vendors',
    desc: 'Manage your store, track sales, and reach thousands of customers with our vendor dashboard.',
  },
  {
    id: 'merchants',
    icon: '💳',
    title: 'Merchants',
    desc: 'Accept payments easily with our secure payment gateway and robust transaction management.',
  },
  {
    id: 'customers',
    icon: '🛍️',
    title: 'Customers',
    desc: 'Shop with confidence, track orders, and enjoy seamless checkout experience.',
  },
]

export const FeatureTabs = () => {
  const [active, setActive] = useState('affiliates')

  return (
    <section id="explore" className="py-16 bg-white">
      <div className="container mx-auto px-4 text-center">
        <h5 className="text-gray-500 uppercase tracking-wider">A Modern Platform That Will</h5>
        <h2 className="text-3xl md:text-4xl font-heading font-bold mt-2 mb-4">Amplify Your Marketing</h2>
        <p className="max-w-2xl mx-auto text-gray-600 mb-12">
          Maximize conversions and grow your revenue with RocketBoost.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {features.map((feat) => (
            <button
              key={feat.id}
              className={`p-6 rounded-xl shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden group ${
                active === feat.id ? 'ring-2 ring-magenta bg-magenta/5' : 'hover:shadow-xl'
              }`}
              onClick={() => setActive(feat.id)}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-magenta transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              <div className="text-4xl mb-3">{feat.icon}</div>
              <p className="font-bold text-lg">{feat.title}</p>
            </button>
          ))}
        </div>

        <div className="bg-gray-50 rounded-xl p-8 shadow-inner">
          {features.map((feat) => (
            <div key={feat.id} className={active === feat.id ? 'block animate-fade-in' : 'hidden'}>
              <h3 className="text-2xl font-bold mb-4">{feat.title}</h3>
              <p className="text-gray-600 leading-relaxed mb-4 text-lg">{feat.desc}</p>
              <a href="#" className="inline-block text-magenta font-semibold hover:underline">
                Learn More →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeatureTabs
