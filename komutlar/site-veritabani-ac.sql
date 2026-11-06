-- Bir siteye ayrı veritabanı ve yalnız ona girebilen ayrı kullanıcı açar (karar 0003, 0022).
-- psql ile yönetici olarak çalışır. Değişkenler: ad (veritabanı ve kullanıcı adı) ve sifre.
-- sifre'yi çağıran bu dosyadan önce verir, hiçbir komut satırında görünmez: bilgisayarda
-- ortam değişkeninden (\getenv, site-veritabani.mts), sunucuda kök kabuğunun girdiden
-- gönderdiği satırdan (sunucu-veritabani.mts). psql :"ad" ve :'sifre' değerlerini kendisi
-- tırnaklar, metin birleştirilmez. Tekrar çalıştırılırsa yalnız şifreyi ve izinleri yeniler.
\set ON_ERROR_STOP on
\if :{?sifre}
\else
  DO $$ BEGIN RAISE EXCEPTION 'sifre verilmedi'; END $$;
\endif
-- Hata olursa PostgreSQL hatalı komutu günlüğe yazar; şifre taşıyan komut yazılmasın.
SET log_min_error_statement = panic;

SELECT NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'ad') AS rol_yok \gset
\if :rol_yok
  CREATE ROLE :"ad" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD :'sifre';
\else
  ALTER ROLE :"ad" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD :'sifre';
\endif

SELECT NOT EXISTS (SELECT FROM pg_database WHERE datname = :'ad') AS veritabani_yok \gset
\if :veritabani_yok
  CREATE DATABASE :"ad" OWNER :"ad";
\endif

-- Varsayılan olarak her kullanıcı her veritabanına bağlanabilir; bu izin kaldırılır.
-- Sitenin kullanıcısı yalnız kendi veritabanına bağlanır, PostgreSQL'in kendi veritabanlarına da giremez.
REVOKE ALL ON DATABASE :"ad" FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE :"ad" TO :"ad";
-- Bu iki kayıt bütün sitelerde ortaktır. Aynı anda değiştirilirse PostgreSQL "tuple concurrently
-- updated" hatası verir (karar 0048), bu yüzden kilitle sırayla değiştirilir. Kilit işlem bitince kalkar.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('site-veritabani-ac')) \gset
REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;
REVOKE CONNECT ON DATABASE template1 FROM PUBLIC;
COMMIT;
