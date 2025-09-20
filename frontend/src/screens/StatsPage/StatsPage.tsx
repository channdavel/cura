import CountUp from "../../components/CountUp/CountUp";

export const StatsPage = (): JSX.Element => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-20">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-light text-gray-800 mb-4">
            Real-Time Pandemic Data
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Track global infection patterns and containment strategies through our advanced simulation platform
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Total Infected Card */}
          <div className="group relative">
            <div className="bg-gradient-to-br from-[#C54444] to-[#B03A3A] rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105">
              <div className="text-center">
                  <div className="text-5xl md:text-6xl font-bold text-white mb-4 group-hover:scale-110 transition-transform duration-300">
                    <CountUp
                      from={0}
                      to={7679676}
                      separator=","
                      direction="up"
                      duration={2.5}
                      delay={0.5}
                      className="count-up-text"
                    />
                  </div>
                <div className="text-xl font-semibold text-white/90 uppercase tracking-wider">
                  Total Infected
                </div>
                <div className="mt-4 w-16 h-1 bg-white/30 rounded-full mx-auto group-hover:bg-white/60 transition-colors duration-300"></div>
              </div>
              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors duration-300"></div>
              <div className="absolute bottom-4 left-4 w-6 h-6 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors duration-300"></div>
            </div>
          </div>

          {/* Active Simulations Card */}
          <div className="group relative">
            <div className="bg-gradient-to-br from-[#C54444] to-[#B03A3A] rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105">
              <div className="text-center">
                  <div className="text-5xl md:text-6xl font-bold text-white mb-4 group-hover:scale-110 transition-transform duration-300">
                    <CountUp
                      from={0}
                      to={150}
                      separator=""
                      direction="up"
                      duration={2}
                      delay={1}
                      className="count-up-text"
                    />
                  </div>
                <div className="text-xl font-semibold text-white/90 uppercase tracking-wider">
                  Active Simulations
                </div>
                <div className="mt-4 w-16 h-1 bg-white/30 rounded-full mx-auto group-hover:bg-white/60 transition-colors duration-300"></div>
              </div>
              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors duration-300"></div>
              <div className="absolute bottom-4 left-4 w-6 h-6 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors duration-300"></div>
            </div>
          </div>

          {/* Avg. Containment Rate Card */}
          <div className="group relative">
            <div className="bg-gradient-to-br from-[#C54444] to-[#B03A3A] rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105">
              <div className="text-center">
                  <div className="text-5xl md:text-6xl font-bold text-white mb-4 group-hover:scale-110 transition-transform duration-300">
                    <CountUp
                      from={0}
                      to={80}
                      separator=""
                      direction="up"
                      duration={2.2}
                      delay={1.5}
                      className="count-up-text"
                    />%
                  </div>
                <div className="text-xl font-semibold text-white/90 uppercase tracking-wider">
                  Avg. Containment Rate
                </div>
                <div className="mt-4 w-16 h-1 bg-white/30 rounded-full mx-auto group-hover:bg-white/60 transition-colors duration-300"></div>
              </div>
              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors duration-300"></div>
              <div className="absolute bottom-4 left-4 w-6 h-6 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors duration-300"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};