import { Button } from "../../components/ui/button";
import Threads from "../../components/Threads/Threads";

const navigationItems = [
  { label: " ", href: "#home" },
  
];

export const LandingPage = (): JSX.Element => {
  return (
    <div
      className="bg-white overflow-hidden w-full min-h-screen relative flex justify-center"
      data-model-id="1:1045"
    >
      <div className="relative w-[1920px] h-[1080px]">
      {/* Modern Navigation Bar */}
      <header className="absolute top-8 left-1/2 transform -translate-x-1/2 w-[90%] max-w-6xl z-50">
        <div className="bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-2xl px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo Section */}
            <div className="flex items-center space-x-4 group cursor-pointer">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C54444] to-[#fc6666] p-0.5">
                  <img
                    className="w-full h-full rounded-lg object-cover"
                    alt="Cura Logo"
                    src="/cura.jpg"
                  />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-[#C54444] to-[#fc6666] rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-gray-900 group-hover:text-[#C54444] transition-colors duration-300">
                  Cura
                </span>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="hidden md:flex items-center space-x-8">
              {navigationItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="relative text-gray-700 hover:text-[#C54444] font-semibold text-sm transition-all duration-300 group py-2"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#C54444] to-[#fc6666] group-hover:w-full transition-all duration-300"></span>
                </a>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-4">
              <Button
                className="bg-gradient-to-r from-[#C54444] to-[#fc6666] hover:from-[#B03A3A] hover:to-[#E55A5A] text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                variant="default"
              >
                Start Simulation
              </Button>
              
              {/* Mobile Menu Button */}
              <button className="md:hidden p-2 rounded-xl text-gray-700 hover:text-[#C54444] hover:bg-gray-100 transition-colors duration-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative">
        {/* Main Hero Text */}
        <h1 className="absolute top-[136px] left-[453px] [text-shadow:4px_4px_4px_#00000040] [-webkit-text-stroke:1px_#000000] [font-family:'SF_Pro-Light',Helvetica] font-light text-black text-[204px] tracking-[0] leading-[normal] whitespace-nowrap translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
          Meet
        </h1>

        <h1 className="absolute top-[223px] left-[1073px] [text-shadow:4px_4px_4px_#00000040] [font-family:'SF_Pro-Regular',Helvetica] font-normal text-black text-[204px] tracking-[0] leading-[normal] whitespace-nowrap translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:400ms]">
          Cura
        </h1>

        {/* Threads Background */}
        <div className="absolute top-[-300px] left-[-500px] w-[2880px] h-[1864px] translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:600ms] z-0">
          <Threads
            color={[0.77, 0.27, 0.27]} // #C54444 in RGB normalized
            amplitude={1}
            distance={0}
            enableMouseInteraction={true}
          />
        </div>

        {/* Central Virus Image */}
        <img
          className="absolute top-[261px] left-[681px] w-[557px] h-[557px] object-cover translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:600ms] z-10"
          alt="Coronavirus 3D model"
          src="https://c.animaapp.com/mfsj1746x5ZdX0/img/image-1.png"
        />

        {/* Explore Button with Arrow */}
        <div className="absolute top-[850px] left-1/2 transform -translate-x-1/2 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:800ms] text-center">
          <button 
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
            className="group flex flex-col items-center space-y-4 hover:scale-105 transition-all duration-300"
          >
            {/* Explore Text with Underline */}
            <div className="relative">
              <span className="text-2xl font-semibold text-gray-800 group-hover:text-[#C54444] transition-colors duration-300">
                Explore
              </span>
              <div className="absolute -bottom-2 left-0 w-0 h-0.5 bg-gradient-to-r from-[#C54444] to-[#fc6666] group-hover:w-full transition-all duration-500"></div>
            </div>
            
            {/* Arrow */}
            <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300 cursor-pointer">
              <svg 
                className="w-8 h-8 text-gray-700 group-hover:text-[#C54444] animate-bounce transition-colors duration-300" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 14l-7 7m0 0l-7-7m7 7V3" 
                />
              </svg>
            </div>
          </button>
        </div>
      </main>

      </div>
    </div>
  );
};
