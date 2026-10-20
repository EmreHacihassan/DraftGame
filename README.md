# Shinobi Draft

Naruto Shippuuden karakterleriyle oynanan, 2 kişilik açık arttırma (draft) oyunu.
Her oyuncu 20 puanla başlar ve teklif vererek 5 karakter toplar.

## Nasıl çalıştırılır

Kurulum gerekmez.

1. Depoyu indir: `git clone https://github.com/EmreHacihassan/DraftGame.git`
2. Klasördeki `index.html` dosyasını tarayıcıda aç.

> İstersen yerel bir sunucuyla da açabilirsin; bu durumda karakter listesi `characters.json` dosyasından okunur:
>
> ```
> python -m http.server 8000
> ```
>
> Ardından tarayıcıda `http://localhost:8000` adresine git.

## Dosyalar

| Dosya | Açıklama |
| --- | --- |
| `index.html` | Oyun sayfası |
| `game.js` | Oyun mantığı |
| `seal-fx.js` | Yasak mührü animasyonları |
| `style.css` | Görünüm |
| `characters.json` | Karakter havuzu |
| `assets/`, `vendor/` | Görseller ve GSAP kütüphanesi |
