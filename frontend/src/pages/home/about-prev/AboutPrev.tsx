const AboutPrev = () => {
  return (
    <div className="w-full h-dvh relative z-50 flex">
      <div className="h-full w-1/2 p-10 flex flex-col gap-30">
        <div className="h-1/2 w-full pt-6 pl-12">
          <h1 className="font-grotesk text-7xl text-slate-200 font-bold w-full">
            Who I am
          </h1>
          <p className="text-lg font-poppins text-slate-400 text-justify pt-10 w-3/4">
            Lorem ipsum, dolor sit amet consectetur adipisicing elit. Ratione
            iusto iste excepturi sequi laborum temporibus tempore qui explicabo
            omnis expedita, aliquid illo nesciunt error, maxime consequuntur
            repellendus alias vero sapiente placeat aspernatur doloremque velit
            itaque.
          </p>
        </div>
        <div className="flex transform translate-x-12 items-center">
          <button className="w-50 h-15 rounded-xl bg-linear-to-tr from-sky-400 to-purple-800 text-slate-300 font-poppins font-bold text-xl cursor-pointer">
            Learn more
          </button>
        </div>
      </div>
      <div className="flex items-center w-1/2 pb-20">
        <div className="relative">
          <div className="flex flex-col gap-0.5 pb-6.5 absolute">
            <h1 className="font-roboto text-slate-200 text-lg font-bold transform translate-x-5">
              START
            </h1>
            <div className="w-3 h-3 rounded-full bg-slate-300 transpose translate-x-12 -translate-y-0.5"></div>
          </div>
          <div className="absolute">
            <div className="w-3 h-3 rounded-full bg-slate-300 transpose translate-x-50"></div>
          </div>
          <div className="absolute">
            <div className="w-3 h-3 rounded-full bg-slate-300 transpose translate-x-100 absolute"></div>
          </div>
        </div>
        <div className="w-1000 h-0.5 bg-slate-500 overflow-x-hidden"></div>
      </div>
    </div>
  );
};

export default AboutPrev;