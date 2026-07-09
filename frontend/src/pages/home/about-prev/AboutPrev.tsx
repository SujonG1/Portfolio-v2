import Timeline from "./about-prev-components/Timeline";

const AboutPrev = () => {
  return (
    <div className="w-full h-dvh z-1000 flex">
      {/* Left side: Static content */}
      <div className="h-full w-1/2 p-10 flex flex-col gap-30">
        <div className="h-1/2 w-full pt-6 pl-12">
          <h1 className="font-grotesk text-7xl text-slate-200 font-bold w-full">
            Who I am
          </h1>
          <p className="text-lg font-poppins text-slate-400 text-justify pt-10 w-3/4">
            Lorem ipsum...
          </p>
        </div>
      </div>
      <div>
        <Timeline />
      </div>
    </div>
  );
};

export default AboutPrev;
