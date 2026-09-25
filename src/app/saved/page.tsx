import type { Metadata } from "next";
import { SavedLocationsManager } from "@/components/weather/SavedLocationsManager";

export const metadata: Metadata = {
  title: "Saved locations",
  description:
    "Manage your saved WeatherIQ locations: reorder, rename, set a default, and check their weather.",
  alternates: { canonical: "/saved" },
};

export default function SavedPage() {
  return <SavedLocationsManager />;
}
