import { Hero } from "@/components/sections/Hero";
import { Marquee } from "@/components/sections/Marquee";
import { About } from "@/components/sections/About";
import { Services } from "@/components/sections/Services";
import { PaidTraffic } from "@/components/sections/PaidTraffic";
import { RealEstate } from "@/components/sections/RealEstate";
import { Audiovisual } from "@/components/sections/Audiovisual";
import { Ecosystem } from "@/components/sections/Ecosystem";
import { Method } from "@/components/sections/Method";
import { Cases } from "@/components/sections/Cases";
import { Differentials } from "@/components/sections/Differentials";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee />
      <About />
      <Services />
      <PaidTraffic />
      <RealEstate />
      <Ecosystem />
      <Audiovisual />
      <Method />
      <Differentials />
      <Cases />
      <FinalCTA />
      <Contact />
    </>
  );
}
