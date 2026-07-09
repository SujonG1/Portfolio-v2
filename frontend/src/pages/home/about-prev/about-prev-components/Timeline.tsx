import React from "react";

const Timeline = () => {
  return (
    <div className="h-full flex-1 overflow-hidden relative bg-transparent">
      {/* The Track */}
      <div className="absolute top-1/2 flex items-center gap-20 px-20">
        {/* Central Line */}
        <div className="absolute w-[2000px] h-0.5 bg-slate-500"></div>

        {/* START: On the line */}
        <div className="relative flex items-center gap-4">
          <div className="w-4 h-4 rounded-full bg-slate-200 z-10"></div>
          <h1 className="text-white font-bold">START</h1>
        </div>

        {/* Event 1: Above the line */}
        <div className="relative flex flex-col items-center">
          <div className="absolute -top-20 flex flex-col items-center">
            <h1 className="text-white font-bold">Event 1</h1>
            <p className="text-slate-400 text-sm">2026</p>
          </div>
          <div className="w-4 h-4 rounded-full bg-slate-200 z-10"></div>
        </div>

        {/* Event 2: Below the line */}
        <div className="relative flex flex-col items-center">
          <div className="w-4 h-4 rounded-full bg-slate-200 z-10"></div>
          <div className="absolute top-8 flex flex-col items-center">
            <h1 className="text-white font-bold">Event 2</h1>
            <p className="text-slate-400 text-sm">2027</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
