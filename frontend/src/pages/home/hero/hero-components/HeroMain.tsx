import { useRef } from 'react'
import Social from './Social'
import { useIntroAnimation } from '../../../../animations/animation-components/Intro'

const HeroMain = () => {
  const container = useRef<HTMLDivElement>(null);
  
  useIntroAnimation(container) 

  return (
    <div className='w-full h-full border-b-1 border-slate-400/30' ref={container}>
      <div className="w-full h-full flex flex-col justify-center items-center gap-2">
        <h1 className="text-7xl font-bold text-slate-200 font-grotesk mt-15 hero-head">
          Sujon Ganguly
        </h1>
        <Social />
        <h1 className="text-7xl p-2 font-bold mt-1 font-grotesk bg-gradient-to-tr from-sky-600 to-purple-900 bg-clip-text text-transparent hero-head">
          Building & Learning
        </h1>
        <p className="hero-para text-slate-400 w-125 text-center text-lg p-5 font-poppins">
          Bringing ideas to life with Machine Learning and Web Developement.
        </p>
        <div className="mt-5 mb-15 hero-btn">
          <button className="bg-linear-to-tr from-sky-600 to-purple-800 py-3 px-5 rounded-full text-white font-poppins font-semibold mr-2 cursor-pointer transition-transform duration-300 ease-in-out !hover:-translate-y-2">
            Send Message
          </button>
          <button className="border-1 text-white font-poppins font-semibold border-white py-3 px-5 rounded-full ml-2 cursor-pointer transition-transform duration-300 ease-in-out !hover:-translate-y-2">
            Explore Lab <i className="ri-arrow-right-line"></i>
          </button>
        </div>
      </div>
    </div>
  )
}

export default HeroMain
