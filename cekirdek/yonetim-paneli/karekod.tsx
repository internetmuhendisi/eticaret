// Sunucuda çizilen karekod (kart 0028). Kurulum adresi gizli anahtarı taşır, dış bir servise gitmez.
import { encode } from "uqr";
import { stil } from "./stil";

export function Karekod({ deger, etiket }: { deger: string; etiket: string }) {
  const { data, size } = encode(deger, { ecc: "M", border: 4 });
  const yol = data
    .flatMap((satir, y) => satir.map((dolu, x) => (dolu ? `M${x} ${y}h1v1h-1z` : "")))
    .join("");
  return (
    <svg
      className={stil.karekod}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={etiket}
      shapeRendering="crispEdges"
    >
      <path d={yol} fill="currentColor" />
    </svg>
  );
}
