import { join } from "node:path";
import type { NextConfig } from "next";

const ayar: NextConfig = {
  // Uygulama çekirdeğin öteki klasörlerinden (metinler/, moduller/...) dosya alır,
  // bu yüzden kök, çalışma alanının köküdür.
  turbopack: { root: join(import.meta.dirname, "../..") },
};

export default ayar;
