import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 90, 92],
  },
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    // Your LAN IP shown in terminal (Next.js dev access from phone/other device)
    "http://10.208.14.209:3000",
  ],
};

export default nextConfig;
