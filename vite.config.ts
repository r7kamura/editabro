import { crx } from "@crxjs/vite-plugin";
import manifest from "./src/manifest.json";

export default {
  plugins: [crx({ manifest })],
};
