// İki sitenin gizli bilgilerinin sunucuda birbirinden ayrı olduğunu ölçer (kart 0019, karar 0031).
// Çalıştırma: pnpm sunucu-gizli-denemesi
//
// Örnek Mağaza'nın canlı gizli bilgileri (yoksa üretilir) ile geçici bir deneme sitesinin gizli
// bilgileri sunucuda yan yana kurulur. İki küçük kutu, sitelerin kutularının kullanacağı gizli
// bilgi tanımıyla (kutuGizliTanimi) açılır. Ölçülenler:
// - A kendi dosyasını okuyor ve yalnız kendi dosyasını görüyor; değer sunucudakiyle aynı.
// - B'nin sunucudaki klasörü A'da yok; A'nın içinde başka gizli bilgi dosyası yok.
// - Bilerek bozma: B'nin dosyası A'nın kullanıcısıyla çalışan bir kutuya bağlanırsa okunamıyor.
// - docker inspect çıktısında hiçbir gizli değer geçmiyor; değer bilerek ortam değişkenine
//   konunca bu ölçüm yakalıyor.
// - Yenileme değeri değiştiriyor; kutu yeni değeri hangi adımda gördüğü ölçülür.
// Değerler ekrana basılmaz; karşılaştırmalar sunucuda özet değerlerle yapılır.
// Sonunda kutular, deneme görüntüsü ve deneme sitesinin gizli bilgileri silinir.

import {
  gizliKlasor,
  kutuGizliTanimi,
  silmeBetigi,
  siteNumaralariniOku,
  uretmeBetigi,
} from "./gizli-bilgi.mts";
import { kayitlariOku, sshKomutu } from "./sunucu.mts";

const ortam = "canli";
const a = { kodAdi: "ornek-magaza", numara: siteNumaralariniOku()["ornek-magaza"] as number };
// Deneme sitesinin numarası kayda yazılmaz; en büyük numara kullanılır.
const b = { kodAdi: "gizli-deneme", numara: 9999 };

const ta = kutuGizliTanimi(ortam, a.kodAdi, a.numara);
const tb = kutuGizliTanimi(ortam, b.kodAdi, b.numara);
const kutu = { image: "busybox", command: ["sleep", "600"], stop_grace_period: "1s" };
const compose = {
  services: {
    a: { ...kutu, ...ta.servis },
    b: { ...kutu, ...tb.servis },
    // Bilerek bozulmuş tanım: A'nın kullanıcısı, B'nin dosyası.
    "a-bozuk": { ...kutu, user: ta.servis.user, secrets: tb.servis.secrets },
  },
  secrets: { ...ta.gizliler, ...tb.gizliler },
};
const dosyaA = `${gizliKlasor(ortam, a.kodAdi)}/veritabani_adresi`;
const dosyaB = `${gizliKlasor(ortam, b.kodAdi)}/veritabani_adresi`;
const ic = "/run/secrets/veritabani_adresi";

const betik = `set -u
d=$(mktemp -d)
hata=0
olcum() { if [ "$1" = 0 ]; then echo "tamam  $2"; else echo "HATA   $2"; hata=$((hata+1)); fi; }
dc() { docker compose -p gizli-denemesi -f "$d/compose.json" "$@" </dev/null; }
temizle() {
  dc down --timeout 1 >/dev/null 2>&1 || true
  docker rm -f gizli-denemesi-sizdiran >/dev/null 2>&1 || true
  docker image rm busybox >/dev/null 2>&1 || true
  ${silmeBetigi(ortam, b.kodAdi).replaceAll("\n", "\n  ").replace("set -eu", "true")}
  rm -f "$d/compose.json"; rmdir "$d"
}
trap temizle EXIT
${uretmeBetigi(ortam, a.kodAdi, a.numara)}
${uretmeBetigi(ortam, b.kodAdi, b.numara)}
set +e
cat > "$d/compose.json" <<'SON'
${JSON.stringify(compose)}
SON
docker pull -q busybox >/dev/null
dc up -d --quiet-pull >/dev/null 2>&1 || { echo "HATA   kutular açılamadı"; exit 1; }
ozet_ic() { dc exec -T "$1" sha256sum ${ic} 2>/dev/null | cut -d" " -f1; }
ozet_dis() { sudo sha256sum "$1" | cut -d" " -f1; }

dc exec -T a sh -c 'test -s "$VERITABANI_ADRESI_DOSYASI"'
olcum $? "A kendi gizli bilgisini dosyadan okuyabiliyor"
[ "$(ozet_ic a)" = "$(ozet_dis ${dosyaA})" ]
olcum $? "A'nın gördüğü değer sunucudaki A değeriyle aynı"
[ "$(ozet_ic a)" != "$(ozet_dis ${dosyaB})" ] && [ "$(ozet_ic b)" = "$(ozet_dis ${dosyaB})" ]
olcum $? "B kendi değerini görüyor, A ile B'nin değeri farklı"
[ "$(dc exec -T a ls /run/secrets)" = "veritabani_adresi" ]
olcum $? "A'da yalnız kendi gizli bilgi dosyası var"
dc exec -T a test -e ${gizliKlasor(ortam, b.kodAdi)}
[ $? -ne 0 ]
olcum $? "B'nin sunucudaki klasörü A'nın içinde yok"
[ "$(dc exec -T a sh -c 'find / -name veritabani_adresi -o -name ".veritabani_adresi.yeni" 2>/dev/null')" = "${ic}" ]
olcum $? "A'nın içinde başka gizli bilgi dosyası yok"
dc exec -T a-bozuk cat ${ic} >/dev/null 2>&1
[ $? -ne 0 ]
olcum $? "bilerek bozma: B'nin dosyası A'nın kullanıcısıyla bağlansa da okunamıyor"

p=$(sudo mktemp)
sudo sh -c "grep -ohE '[0-9a-f]{64}' ${dosyaA} ${dosyaB} > $p"
# Desen dosyası kök kullanıcıya aittir; sayımı da kök yapar. İki desen de yoksa ölçüm geçersizdir.
[ "$(sudo sh -c "wc -l < $p")" = 2 ] && [ "$(docker inspect $(dc ps -aq) | sudo grep -c -F -f $p)" = 0 ]
olcum $? "docker inspect çıktısında gizli değer yok"
# Bilerek bozma: B'nin değeri bir kutunun ortam değişkenine konursa aynı ölçüm yakalamalı.
# Değer kök kullanıcının dosyasından okunur, hiçbir komut satırında görünmez.
q=$(sudo mktemp)
sudo sh -c "printf 'VERITABANI_ADRESI=%s\\n' \\"\\$(cat ${dosyaB})\\" > $q"
sudo docker run -d -q --name gizli-denemesi-sizdiran --env-file $q busybox sleep 30 >/dev/null
[ "$(docker inspect gizli-denemesi-sizdiran | sudo grep -c -F -f $p)" != 0 ]
olcum $? "bilerek bozma: ortam değişkenine konan değeri inspect ölçümü yakalıyor"
docker rm -f gizli-denemesi-sizdiran >/dev/null 2>&1
sudo rm -f $p $q

once=$(ozet_dis ${dosyaB})
${uretmeBetigi(ortam, b.kodAdi, b.numara, { yenile: true })}
set +e
sonra=$(ozet_dis ${dosyaB})
[ "$once" != "$sonra" ]
olcum $? "yenileme B'nin değerini değiştirdi"
[ "$(ozet_ic b)" = "$sonra" ] && echo "bilgi  kutu yeni değeri yeniden başlamadan gördü" || echo "bilgi  kutu yeniden başlamadan eski değeri görüyor"
dc restart --timeout 1 b >/dev/null 2>&1
[ "$(ozet_ic b)" = "$sonra" ]
olcum $? "kutu yeniden başlayınca yeni değeri görüyor"
[ "$(ozet_ic a)" = "$(ozet_dis ${dosyaA})" ]
olcum $? "B'nin yenilenmesi A'yı etkilemedi"
echo "hata=$hata"
[ "$hata" -eq 0 ]
`;

try {
  const [sunucu] = kayitlariOku();
  if (!sunucu) throw new Error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  console.log(`${sunucu.ad}: ${a.kodAdi} ile geçici ${b.kodAdi} yan yana deneniyor...`);
  const sonuc = sshKomutu(sunucu.ipv4, "bash -s", { girdi: betik });
  process.stdout.write(sonuc.stdout);
  if (sonuc.stderr.trim()) console.error(sonuc.stderr.trim());
  console.log(sonuc.status === 0 ? "Deneme yeşil." : "Deneme kırmızı.");
  if (sonuc.status !== 0) process.exitCode = 1;
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
