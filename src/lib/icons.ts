import { Activity, Armchair, BatteryCharging, CarFront, Cog, Disc3, Droplets, Filter, Gauge, Lightbulb, Sparkles, Umbrella, type LucideIcon } from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  disc: Disc3, cog: Cog, activity: Activity, lightbulb: Lightbulb,
  filter: Filter, droplets: Droplets, battery: BatteryCharging, sparkles: Sparkles,
  umbrella: Umbrella, armchair: Armchair, gauge: Gauge, "car-front": CarFront,
};
