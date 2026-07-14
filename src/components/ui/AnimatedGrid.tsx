import { cn } from "@/lib/utils";

interface AnimatedGridProps {
  className?: string;
  fade?: "radial" | "bottom" | "none";
}

export function AnimatedGrid({ className, fade = "radial" }: AnimatedGridProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div
        className={cn(
          "absolute inset-0 bg-grid animate-grid-pan opacity-60",
          fade === "radial" &&
            "[mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black_10%,transparent_75%)]",
          fade === "bottom" &&
            "[mask-image:linear-gradient(to_bottom,black,transparent)]"
        )}
      />
    </div>
  );
}
