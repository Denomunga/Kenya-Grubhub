import { Link } from 'wouter'

export const FloatingOrderButton = () => (
  <Link
    to="/ordersearch"
    className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-center gap-2 bg-magenta text-white font-bold px-5 py-3 rounded-r-xl shadow-2xl animate-slide-in-left hover:bg-[#c51471] transition-colors"
  >
    <span className="hidden md:inline">Find</span>
    <span className="hidden md:inline">My</span>
    <span className="hidden md:inline">Order</span>
    {/* Mobile stacked version */}
    <span className="flex flex-col md:hidden text-center text-xs uppercase tracking-wide leading-tight">
      <span>FIND</span>
      <span>MY</span>
      <span>ORDER</span>
    </span>
  </Link>
)
