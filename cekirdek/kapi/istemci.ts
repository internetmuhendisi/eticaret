// Tarayıcıdan kapıya giden her istek (kart 0065, karar 0139). Kapının zarflı yanıtları önbelleğe alınmaz
// (`no-store`): tarayıcı böyle bir yanıtın gövdesini kendiliğinden indirmez, okunmayan gövde (ör. yalnız
// durum koduna bakılan 401) isteği hiç bitmemiş bırakır ve bağlantıyı tutar. Bu işlev gövdeyi her zaman
// sonuna kadar okur; dönen yanıt aynı durum, başlık ve gövdeyi taşır. Doğrudan `fetch` denetimde hatadır.

// Gövdesi olmayan durumlar: Response bu durumlarla gövde alamaz.
export const govdesizDurumlar = new Set([101, 204, 205, 304]);

export const kapiyaIstek = async (adres: string, istek?: RequestInit): Promise<Response> => {
  const yanit = await fetch(adres, istek);
  const govde = await yanit.arrayBuffer();
  return new Response(govdesizDurumlar.has(yanit.status) ? null : govde, {
    status: yanit.status,
    statusText: yanit.statusText,
    headers: yanit.headers,
  });
};
