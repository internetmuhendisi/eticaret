"use client";
// Hata özeti örneği (kart 0259): alana götüren satır ve alanı olmayan hatanın düz satırı.
import { useState } from "react";
import { HataOzeti } from "../../../bilesenler/form/hata-ozeti";
import { useOrnekMetni } from "./ortak";

export function HataOzetiOrnegi() {
  const m = useOrnekMetni();
  const [gidildi, setGidildi] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <HataOzeti
        baslik={m("hataOzeti.baslik")}
        hatalar={[
          { metin: m("hataOzeti.alan"), git: () => setGidildi(true) },
          { metin: m("hataOzeti.genel") },
        ]}
      />
      <p role="status">{gidildi ? m("hataOzeti.gidildi") : ""}</p>
    </div>
  );
}
