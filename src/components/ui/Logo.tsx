import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function Logo({ className, width = 160, height = 48, priority = false }: LogoProps) {
  return (
    <Image
      src="/images/logo.png"
      alt="Brain Marketing & Performance"
      width={width}
      height={height}
      priority={priority}
      style={{ objectFit: "contain" }}
      className={cn("shrink-0", className)}
    />
  );
}
