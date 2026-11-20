"use client";
// Panelin ve bileşen kataloğunun tarayıcıdaki metin okuyucusu (kart 0253, karar 0152): bütün metin dosyasını okur.
// Yalnız panel (cekirdek/yonetim-paneli/) ve katalog (cekirdek/katalog/) ekranları kullanır; vitrinin tarayıcı koduna
// girmez (`cekirdek/metinler/testler/vitrin-metinleri.test.ts` denetler).
import { useDil } from "./istemci-metni";
import { metinOkuyucu } from "./metin";

export const usePanelMetni = () => metinOkuyucu(useDil());
