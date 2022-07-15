import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

export default {
  plugins: [crx({ manifest })],
};
