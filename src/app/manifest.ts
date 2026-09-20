import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "REBOOT — Student OS",
    short_name: "REBOOT",
    description: "Your personal academic recovery and student operating system.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#090b0e",
    theme_color: "#090b0e",
    orientation: "portrait",
    icons: [
      {
        src: "/reboot-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/reboot-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
