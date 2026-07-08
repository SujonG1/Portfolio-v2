import React from 'react'
import Hero from './hero/Hero'
import AboutPrev from './about-prev/AboutPrev'

const Home = () => {
  return (
    <div className='w-full h-full bg-slate-950'>
      <Hero />
      <AboutPrev />
    </div>
  )
}

export default Home
