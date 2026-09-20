import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "REBOOT — Student OS",
    short_name: "REBOOT",
    description: "Your personal academic recovery and student operating system.",
    start_url: "/",
    display: "standalone",
    background_color: "#090b0e",
    theme_color: "#090b0e",
    orientation: "portrait",
    icons: [
      {
        src: "/reboot-icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
