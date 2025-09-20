
export const FeaturesPage = (): JSX.Element => {
  return (
    <div className="min-h-screen bg-white py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left Section - Header Content */}
          <div className="space-y-8 pt-8">
            {/* Subtitle */}
            <div className="inline-block">
              <span className="px-3 py-1 bg-[#C54444] text-white text-sm font-semibold rounded-full">
                Built for prevention
              </span>
            </div>

            {/* Main Title */}
            <h2 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Take your pandemic response
              <span className="block text-[#C54444]">further, faster</span>
            </h2>

            {/* Description */}
            <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
              Healthcare organizations build on Cura to respond faster, adapt as outbreaks evolve, and automate 
              containment strategies to do more with less. Build your own simulation integration or use our 
              low- to no-code solutions, which are simple enough for easy implementation and powerful enough 
              to scale as fast and as far as you need.
            </p>
          </div>

          {/* Right Section - Feature Cards Grid */}
          <div className="grid grid-cols-1 gap-6">
            {/* Simulate Outbreaks Card */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#C54444] to-[#fc6666] rounded-xl flex items-center justify-center p-2">
                    <img 
                      src="/cura.jpg" 
                      alt="Cura Logo" 
                      className="w-full h-full rounded-lg object-cover"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      Cura
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Simulate outbreak scenarios
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Model disease transmission, test containment strategies, and predict outcomes with AI-powered simulations.
                  </p>
                  
                  {/* Interactive Demo */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-2 h-2 bg-[#C54444] rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Cura Simulation</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-[#C54444] rounded-full flex items-center justify-center">
                          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">Initialize outbreak parameters</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-[#C54444] rounded-full flex items-center justify-center">
                          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">Configure population density</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-[#C54444] rounded-full flex items-center justify-center">
                          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">Set transmission rates</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                          <svg className="w-2 h-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-500">Deploy containment measures</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Monitoring Card */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#C54444] to-[#fc6666] rounded-xl flex items-center justify-center p-2">
                    <img 
                      src="free-location-map-icon-2956-thumb.png" 
                      alt="Map Icon" 
                      className="w-full h-full rounded-lg object-cover"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      Monitor
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Real-time outbreak monitoring
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Track infection patterns, monitor containment zones, and analyze geographical data with live dashboards.
                  </p>
                  
                  {/* Payment Form Demo */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Outbreak Location</label>
                        <input 
                          type="text" 
                          value="New York City, NY" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Infection Rate</label>
                        <input 
                          type="text" 
                          value="2.3% daily increase" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          readOnly
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">R0 Value</label>
                          <input 
                            type="text" 
                            value="1.8" 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Containment</label>
                          <input 
                            type="text" 
                            value="75%" 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Validate Strategies Card */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#C54444] to-[#fc6666] rounded-xl flex items-center justify-center p-2">
                    <img 
                      src="/mask.webp" 
                      alt="Mask Icon" 
                      className="w-full h-full rounded-lg object-cover"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      Validate
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Validate containment strategies
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Test your response protocols with AI-powered simulations before implementing real-world strategies.
                  </p>
                  
                  {/* Chat Interface Demo */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex space-x-4">
                      <div className="flex-1">
                        <div className="space-y-3">
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <p className="text-sm text-gray-700">What's the best containment strategy for this outbreak?</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <p className="text-sm text-gray-700">I recommend implementing social distancing measures immediately</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <p className="text-sm text-gray-700">Let me run a simulation to validate that approach...</p>
                          </div>
                        </div>
                      </div>
                      <div className="w-20 h-20 bg-gradient-to-br from-[#C54444] to-[#fc6666] rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Deploy Resources Card */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#C54444] to-[#fc6666] rounded-xl flex items-center justify-center p-2">
                    <img 
                      src="/transparent.png" 
                      alt="Parameters" 
                      className="w-full h-full rounded-lg object-cover"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      Deploy
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Deploy emergency resources
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Optimize resource allocation based on simulation data. Deploy medical supplies, personnel, 
                    and equipment where they're needed most.
                  </p>
                  
                  {/* Chart Demo */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="mb-3">
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Resource Distribution</h4>
                      <div className="text-xs text-gray-500">Current period vs Previous period</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Medical Supplies</span>
                        <span className="text-gray-900 font-medium">85% deployed</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-[#C54444] to-[#fc6666] h-2 rounded-full" style={{width: '85%'}}></div>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Personnel</span>
                        <span className="text-gray-900 font-medium">72% deployed</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-[#C54444] to-[#fc6666] h-2 rounded-full" style={{width: '72%'}}></div>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Equipment</span>
                        <span className="text-gray-900 font-medium">91% deployed</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-[#C54444] to-[#fc6666] h-2 rounded-full" style={{width: '91%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section - Red Curved Square */}
        <div className="mt-20">
          <div className="relative w-full h-96 bg-gradient-to-br from-[#C54444] to-[#fc6666] rounded-3xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 left-4 w-8 h-8 border-2 border-white rounded-lg"></div>
              <div className="absolute top-4 right-4 w-6 h-6 border-2 border-white rounded-full"></div>
              <div className="absolute bottom-4 left-4 w-6 h-6 border-2 border-white rounded-full"></div>
              <div className="absolute bottom-4 right-4 w-8 h-8 border-2 border-white rounded-lg"></div>
            </div>
            
            {/* Content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-8">
              <h3 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                Ready to <span className="text-white/90">simulate</span> the future?
              </h3>
              <p className="text-white/80 text-xl mb-8 leading-relaxed max-w-2xl">
                Start your pandemic response strategy with our advanced simulation platform
              </p>
              
              <button className="group relative px-8 py-4 bg-white text-[#C54444] font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                <span className="relative z-10 flex items-center space-x-3">
                  <span>Start Simulation</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};