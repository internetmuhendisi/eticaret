# check=skip=InvalidDefaultArgInFrom
# Çekirdeğin Docker görüntüsü (kart 0015, karar 0027). Görüntüde site klasörü ve gizli bilgi
# yoktur; ikisi de kutu çalışırken dışarıdan verilir. Üretmek: pnpm cekirdek-goruntusu
# Bağlam çalışma alanının köküdür; içeri yalnız Dockerfile.dockerignore'un izin verdiği dosyalar girer.
#
# Çalıştırmak:
#   docker run -v <site klasörü>:/siteler/<kod-adi>:ro -e SITE_KLASORU=/siteler/<kod-adi> \
#     -e VERITABANI_ADRESI=... -p 3000:3000 altyapi-cekirdek:<sürüm>
# Sunucuda gizli bilgi ortam değişkeniyle değil, dosyayla verilir: VERITABANI_ADRESI_DOSYASI=
# /run/secrets/veritabani_adresi ve kutu sitenin kendi kullanıcı numarasıyla çalışır (karar 0031).

# Node.js ve pnpm sürümleri kökteki package.json'dan gelir (karar 0016); komut onları buraya
# verir. Varsayılan değer yoktur, sürüm ikinci bir yerde yazmaz (ilk satırdaki uyarı bu yüzden kapalı).
ARG NODE_SURUMU

FROM node:${NODE_SURUMU}-alpine AS derleme
ARG PNPM_SURUMU
WORKDIR /kaynak
ENV NEXT_TELEMETRY_DISABLED=1
# pnpm tam sürümüyle kurulur. Sürümü pnpm'in kendisi denetlemez (pm-on-fail=ignore); yereldeki
# kurulum da böyle çalışır ve kilit dosyası iki yerde aynı okunur (karar 0027).
RUN npm install --global --silent "pnpm@${PNPM_SURUMU}"
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY cekirdek/uygulama/package.json cekirdek/uygulama/
COPY bilesenler/package.json bilesenler/
COPY sahip-paneli/package.json sahip-paneli/
RUN pnpm install --frozen-lockfile --ignore-scripts --config.pm-on-fail=ignore
COPY . .
RUN pnpm --filter cekirdek-uygulama derle
# Sunucuda veritabanı değişikliklerini uygulayan parça (kart 0039, karar 0034): kullandığı paketler
# içine gömülü tek dosya. pg CommonJS'tir; require gömülü dosyada yeniden tanımlanır.
RUN pnpm exec esbuild cekirdek/veritabani/sunucuda-guncelle.ts --bundle --platform=node \
      --format=esm --target=node24 --external:pg-native --log-level=warning \
      --banner:js="import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" \
      --outfile=/kaynak/veritabani/guncelle.mjs \
    && cp -R cekirdek/veritabani/degisiklikler /kaynak/veritabani/degisiklikler
# Hata izleme aracının sunucudaki denemesi (kart 0022, karar 0036): yalnız docker exec ile çalışır.
RUN pnpm exec esbuild cekirdek/izleme/hata-izleme-denemesi.ts --bundle --platform=node \
      --format=esm --target=node24 --log-level=warning \
      --outfile=/kaynak/izleme/hata-denemesi.mjs
# Arka plan süreci ve denemesi (kart 0031, karar 0049): kullandıkları paketler içine gömülü tek dosyalar.
# sharp gömülmez (kart 0087): yerli ikili dosya taşır, kendi içindeki createRequire üstteki satırla
# çakışır. Başlangıç kataloğunun görselleri onu uygulamanın node_modules klasöründen yükler.
RUN pnpm exec esbuild cekirdek/arka-plan-isleri/surec.ts cekirdek/arka-plan-isleri/deneme.ts \
      --bundle --platform=node --format=esm --target=node24 --external:pg-native --external:sharp \
      --log-level=warning \
      --banner:js="import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" \
      --outdir=/kaynak/arka-plan --out-extension:.js=.mjs

# Sunucuda yönetici açan parça (kart 0048, karar 0054): dışarıya uç açmaz, geçici kutuda çalışır.
RUN pnpm exec esbuild cekirdek/moduller/ekip/sunucuda-yonetici.ts --bundle --platform=node \
      --format=esm --target=node24 --external:pg-native --log-level=warning \
      --banner:js="import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" \
      --outfile=/kaynak/yonetici/yonetici.mjs

FROM node:${NODE_SURUMU}-alpine
ARG CEKIRDEK_SURUMU
LABEL org.opencontainers.image.version="${CEKIRDEK_SURUMU}"
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /uygulama
# Kod kök kullanıcıya aittir ve uygulama onu değiştiremez; uygulama node kullanıcısıyla çalışır.
COPY --from=derleme /kaynak/cekirdek/uygulama/.next/standalone ./
COPY --from=derleme /kaynak/cekirdek/uygulama/.next/static ./cekirdek/uygulama/.next/static
COPY --from=derleme /kaynak/veritabani ./veritabani
COPY --from=derleme /kaynak/izleme ./izleme
COPY --from=derleme /kaynak/arka-plan ./arka-plan
COPY --from=derleme /kaynak/yonetici ./yonetici
USER node
EXPOSE 3000
CMD ["node", "cekirdek/uygulama/server.js"]
