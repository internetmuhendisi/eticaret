"use client";
// Siparişin durum rozeti (kart 0234): rengi ve metni kayıttan (siparisDurumTanimlari, durumMetni). Liste (tarayıcıda)
// ve ayrıntı (sunucuda) aynı parçayı kullanır.
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { type SiparisDurumu, siparisDurumTanimlari } from "../../kayitlar/siparis";
import { usePanelMetni } from "../../metinler/panel-metni";
import { durumMetni } from "./metinler";

export function DurumRozeti({ durum }: { durum: SiparisDurumu }) {
  const metin = usePanelMetni();
  return <Rozet tur={siparisDurumTanimlari[durum].rozet}>{metin(durumMetni(durum))}</Rozet>;
}
