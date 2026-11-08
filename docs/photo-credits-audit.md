# Card photo credits audit

Audit date: 2026-11-03. Read-only: nothing in the database, Storage or repo was changed. Scope: the 84 `place_library` cards that have photos (192 files in the public Storage bucket `card-photos`).

## Summary

| Group | Files | Cards with at least one file in the group | Cards whose every photo is in the group |
|---|---:|---:|---:|
| A. Free licence, no credit needed | 15 | 9 | 3 |
| B. Free licence, credit required | 68 | 42 | 20 |
| C. Not free / unverified | 109 | 59 | 38 |
| Total | 192 | 84 | 84 |

Group A = Wikimedia Commons files tagged CC0 or Public domain. Group B = Commons files under CC BY / CC BY-SA (attribution required). Group C = everything else: the bytes were found on a third-party page, Tabelog or an Instagram post, or their origin is unknown. For group C no licence was verified; the legal position is "all rights reserved unless the owner says otherwise".

### Files by origin

| Origin | Files | A | B | C |
|---|---:|---:|---:|---:|
| Wikimedia Commons | 83 | 15 | 68 | 0 |
| Instagram post image | 9 | 0 | 0 | 9 |
| Tabelog | 10 | 0 | 0 | 10 |
| Official website | 8 | 0 | 0 | 8 |
| Official website (field points to a tourism-portal page) | 1 | 0 | 0 | 1 |
| Other web page | 75 | 0 | 0 | 75 |
| Origin unknown | 6 | 0 | 0 | 6 |

### How reliable the matching is

- **186 of 192 files matched by SHA-256** against a file I downloaded myself from Wikimedia (83 files) or from a page the card itself links to (Instagram embed, Tabelog photo list, website or source page: 103 files). A matching hash means the stored file is byte-identical to that download.
- **0 files were inferred** from looks, names or guesses.
- **6 files have an unknown origin** (see group C, "Origin unknown"). Their source pages either did not contain the bytes or could not be fetched from this machine (HTTP 403/429 from tripadvisor.com, alamy.com, fodors.com, corner.inc and others; I did not try to get around that).
- For Commons files the licence is what the Commons file page says today (API `extmetadata`), not independently checked. A licence tag on Commons is the uploader's claim.
- For files found on a third-party page, "found there" is not proof that the page is the original source or the rights holder: the page may itself have copied the picture. Where a file matched several pages I list the first match in the table; all matches are in `/private/tmp/claude-501/-Users-maorsaadon-RentCalc-RentCalc/photo-audit/` (scratch files, not in the repo).
- The function stores the 1280 px thumbnail that Wikimedia returns, not the original upload. Showing it unchanged with credit is the normal use. A CC BY-SA licence also applies to adaptations; nothing here crops or edits the pictures.
- The Wikipedia/Commons candidate search was re-run today; search rankings may differ from the day the photos were stored, but because matching is by hash, a match is real regardless of ranking. The duplicates in Wikipedia lead images (one picture found by both the English and Japanese article) are listed once.

## Group A: free licence, no credit needed

CC0 and Public domain. No credit is legally needed; crediting the author anyway is polite.

| Card | City | Category | File (n) | Source host | Licence | Author | Commons file page |
|---|---|---|---:|---|---|---|---|
| Motomachi Shopping Street | yokohama | shopping | 1 (jpg) | commons.wikimedia.org | CC0 | Matthide127 | [20250103 Motomachi, Yokohama 121342.jpg](https://commons.wikimedia.org/wiki/File:20250103_Motomachi,_Yokohama_121342.jpg) |
| Motomachi Shopping Street | yokohama | shopping | 2 (jpg) | commons.wikimedia.org | CC0 | Matthide127 | [20250103 Motomachi, Yokohama 121936.jpg](https://commons.wikimedia.org/wiki/File:20250103_Motomachi,_Yokohama_121936.jpg) |
| Motomachi Shopping Street | yokohama | shopping | 3 (jpg) | commons.wikimedia.org | Public domain | WhisperToMe | [MotomachiYokohama.JPG](https://commons.wikimedia.org/wiki/File:MotomachiYokohama.JPG) |
| Yokohama Hakkeijima Sea Paradise | yokohama | experience | 3 (jpg) | commons.wikimedia.org | Public domain | Sidecoast | [Yokohama Hakkeijima Sea Paradise.jpg](https://commons.wikimedia.org/wiki/File:Yokohama_Hakkeijima_Sea_Paradise.jpg) |
| Tsurugaoka Hachimangu Shrine | daytrip | sight | 1 (jpg) | commons.wikimedia.org | Public domain | Fg2 | [TsurugaokaHachiman-M8867.jpg](https://commons.wikimedia.org/wiki/File:TsurugaokaHachiman-M8867.jpg) |
| Tsurugaoka Hachimangu Shrine | daytrip | sight | 2 (jpg) | commons.wikimedia.org | CC0 | Ocdp | [Tsurugaoka Hachimangu 001.jpg](https://commons.wikimedia.org/wiki/File:Tsurugaoka_Hachimangu_001.jpg) |
| Osaka Aquarium Kaiyukan | osaka | sight | 3 (jpg) | commons.wikimedia.org | CC0 | Sakai Yayoi | [Kaiyūkan.jpg](https://commons.wikimedia.org/wiki/File:Kaiy%C5%ABkan.jpg) |
| Hikawa Maru | yokohama | sight | 2 (jpg) | commons.wikimedia.org | CC0 | Tokyo538 | [Hikawa Maru at Yokohama Port.jpg](https://commons.wikimedia.org/wiki/File:Hikawa_Maru_at_Yokohama_Port.jpg) |
| Marine & Walk Yokohama | yokohama | experience | 1 (jpg) | commons.wikimedia.org | CC0 | NEO-NEED | [MARINE & WALK YOKOHAMA 05.jpg](https://commons.wikimedia.org/wiki/File:MARINE_%26_WALK_YOKOHAMA_05.jpg) |
| Marine & Walk Yokohama | yokohama | experience | 2 (jpg) | commons.wikimedia.org | CC0 | Matthide127 | [20250102 InterContinental Yokohama Grand, Yokohama Hammerhead, Marine & Walk Yokohama 203223.jpg](https://commons.wikimedia.org/wiki/File:20250102_InterContinental_Yokohama_Grand,_Yokohama_Hammerhead,_Marine_%26_Walk_Yokohama_203223.jpg) |
| Marine & Walk Yokohama | yokohama | experience | 3 (jpg) | commons.wikimedia.org | CC0 | Matthide127 | [20250102 InterContinental Yokohama Grand, InterContinental Yokohama Pier 8, Marine & Walk Yokohama 203215.jpg](https://commons.wikimedia.org/wiki/File:20250102_InterContinental_Yokohama_Grand,_InterContinental_Yokohama_Pier_8,_Marine_%26_Walk_Yokohama_203215.jpg) |
| Nissan Gallery (Global Headquarters) | yokohama | experience | 1 (jpg) | commons.wikimedia.org | CC0 | Kazyakuruma | [Nissan IMk Concept, 2021, front, Nissan Gallery HQ.jpg](https://commons.wikimedia.org/wiki/File:Nissan_IMk_Concept,_2021,_front,_Nissan_Gallery_HQ.jpg) |
| Nissan Gallery (Global Headquarters) | yokohama | experience | 2 (jpg) | commons.wikimedia.org | CC0 | Kazyakuruma | [Nissan IMk Concept, 2021, rear, Nissan Gallery HQ.jpg](https://commons.wikimedia.org/wiki/File:Nissan_IMk_Concept,_2021,_rear,_Nissan_Gallery_HQ.jpg) |
| Hokokuji (Bamboo Temple) | daytrip | sight | 2 (jpg) | commons.wikimedia.org | Public domain | Urashimataro | [Hokokuji Bamboo Forest Kamakura.jpg](https://commons.wikimedia.org/wiki/File:Hokokuji_Bamboo_Forest_Kamakura.jpg) |
| Hase-dera Temple | daytrip | sight | 3 (jpg) | commons.wikimedia.org | CC0 | Mustang Joe | [Hase-dera Temple, Kamakura, Japan (14645090803).jpg](https://commons.wikimedia.org/wiki/File:Hase-dera_Temple,_Kamakura,_Japan_(14645090803).jpg) |

## Group B: free licence, credit required

Credit line format: Photo: author / Wikimedia Commons, licence (licence link), with a link to the file page. For CC BY-SA, share-alike applies if the picture is adapted.

| Card | City | Category | File (n) | Source host | Licence | Author | Credit line to display |
|---|---|---|---:|---|---|---|---|
| Daimaru Kyoto | kyoto | shopping | 1 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | Tokumeigakarinoaoshima | Photo: Tokumeigakarinoaoshima / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:DAIMARU_Shinsaibashi_Store_Main_Building.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Daimaru Kyoto | kyoto | shopping | 2 (jpg) | commons.wikimedia.org | CC BY 4.0 | Fotointheworld | Photo: Fotointheworld / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Daimaru_Kyoto_B1_2025.JPG), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| Gotemba Premium Outlets | daytrip | shopping | 3 (jpg) | commons.wikimedia.org | CC BY-SA 3.0 | Jungle (Commons uploader; the file says "myself, I took the picture") | Photo: Jungle (Commons uploader; the file says "myself, I took the picture") / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Gotemba_premium_outlets1.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| Daikanyama T-Site (Tsutaya Books) | tokyo | shopping | 1 (jpg) | commons.wikimedia.org | CC BY-SA 2.0 | Jonathan Lin | Photo: Jonathan Lin / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Daikanyama_T-SITE_2016-04-04.jpg), [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) |
| Daikanyama T-Site (Tsutaya Books) | tokyo | shopping | 2 (jpg) | commons.wikimedia.org | CC BY 2.0 | Dick Thomas Johnson from Tokyo, Japan | Photo: Dick Thomas Johnson from Tokyo, Japan / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Daikanyama_T-Site_(52501525906).jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| Daikanyama T-Site (Tsutaya Books) | tokyo | shopping | 3 (jpg) | commons.wikimedia.org | CC BY 2.0 | Dick Thomas Johnson from Tokyo, Japan | Photo: Dick Thomas Johnson from Tokyo, Japan / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Daikanyama_T-Site_(52501997410).jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| Toji Temple Shimai-Kobo Market | kyoto | shopping | 1 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | Kakidai | Photo: Kakidai / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Toji_2015.JPG), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Yokohama Chinatown | yokohama | sight | 1 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | Wpcpey | Photo: Wpcpey / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Yokohama_Chinatown_signage_2015.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Umeda Sky Building Christmas Market (Wonder Christmas Marche) | osaka | shopping | 2 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | Kakidai | Photo: Kakidai / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:2018_Umeda_Sky_Building.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Sankeien Garden | yokohama | sight | 2 (jpg) | commons.wikimedia.org | CC BY-SA 3.0 | Arisdp | Photo: Arisdp / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Sangkaien_Garden.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| Kotoku-in (Kamakura Great Buddha) | daytrip | sight | 1 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | 663highland | Photo: 663highland / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:230128_Kamakura_Daibutsu_Japan01s3.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Yokohama Hakkeijima Sea Paradise | yokohama | experience | 2 (jpg) | commons.wikimedia.org | CC BY 2.0 | U.S. Army photos by Sgt. John L. Carkeet IV, U.S. Army Japan | Photo: U.S. Army photos by Sgt. John L. Carkeet IV, U.S. Army Japan / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Yokohama_Hakkeijima_Sea_Paradise_2015_(crop).jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| Tokyo Joypolis | tokyo | experience | 1 (jpg) | commons.wikimedia.org | CC BY-SA 3.0 | Fallschirmjäger | Photo: Fallschirmjäger / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Sega_Joypolis_Odaiba.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| Tokyo Joypolis | tokyo | experience | 2 (jpg) | commons.wikimedia.org | CC BY 2.5 | Dave Pape (en.wikipedia user Davepape) | Photo: Dave Pape (en.wikipedia user Davepape) / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Tokyo_Joypolis_entrance.jpg), [CC BY 2.5](https://creativecommons.org/licenses/by/2.5) |
| Tokyo Joypolis | tokyo | experience | 3 (jpg) | commons.wikimedia.org | CC BY-SA 3.0 | ITA-ATU | Photo: ITA-ATU / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Tokyo_Joypolis.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| Cupnoodles Museum Yokohama | yokohama | experience | 1 (jpg) | commons.wikimedia.org | CC BY-SA 3.0 | Rs1421 | Photo: Rs1421 / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Cupnoodles-Museum-Yokohama.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| Cupnoodles Museum Yokohama | yokohama | experience | 2 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | Natalie Lauer | Photo: Natalie Lauer / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Cupnoodles_Museum_Yokohama_2017.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Aritsugu | kyoto | shopping | 1 (jpg) | commons.wikimedia.org | CC BY-SA 2.0 | matsuyuki from Nishiki Ichiba, Kyoto | Photo: matsuyuki from Nishiki Ichiba, Kyoto / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Kitchen_tools_store_by_matsuyuki_in_Nishiki_Ichiba,_Kyoto.jpg), [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) |
| Nogeyama Zoo | yokohama | sight | 3 (jpg) | commons.wikimedia.org | CC BY 2.5 | Dddeco | Photo: Dddeco / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Nogeyama_Zoo.JPG), [CC BY 2.5](https://creativecommons.org/licenses/by/2.5) |
| KITTE Marunouchi | tokyo | shopping | 1 (jpg) | commons.wikimedia.org | CC BY-SA 3.0 | Rs1421 | Photo: Rs1421 / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:JP-Tower-01.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| KITTE Marunouchi | tokyo | shopping | 2 (jpg) | commons.wikimedia.org | CC BY 2.0 | othree | Photo: othree / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Good_Design_Shop_by_Nohara,_KITTE_Marunouchi_(2017-06-29_13.59.59_by_othree).jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| Enoden (Kamakura to Hase scenic train) | daytrip | experience | 1 (jpg) | commons.wikimedia.org | CC BY-SA 3.0 | DXR | Photo: DXR / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Enoden_2002_at_Enoshima_Station.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| Yokohama Hammerhead | yokohama | experience | 1 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | NEO-NEED | Photo: NEO-NEED / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:YOKOHAMA_HAMMERHEAD_-_D00b.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Yokohama Air Cabin | yokohama | experience | 3 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | NEO-NEED | Photo: NEO-NEED / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:YOKOHAMA_AIR_CABIN_20210421c.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Osaka Aquarium Kaiyukan | osaka | sight | 1 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | そらみみ | Photo: そらみみ / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Osaka_Aquarium_%22Kaiyukan%22_20190201-2.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Osaka Aquarium Kaiyukan | osaka | sight | 2 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | そらみみ | Photo: そらみみ / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Osaka_Aquarium_%22Kaiyukan%22_20190201.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| MARK IS Minatomirai | yokohama | shopping | 2 (jpg) | commons.wikimedia.org | CC BY-SA 3.0 | Thirteen-fri | Photo: Thirteen-fri / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:MARK_IS_minatomirai_5.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| Yokohama Landmark Plaza (Baby Rest Room) | yokohama | experience | 1 (jpg) | commons.wikimedia.org | CC BY-SA 3.0 | Nandaro | Photo: Nandaro / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Yokohama_Landmark_Plaza_(5F).JPG), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| Yokohama Landmark Plaza (Baby Rest Room) | yokohama | experience | 2 (jpg) | commons.wikimedia.org | CC BY 2.0 | Guilhem Vellut from Annecy, France | Photo: Guilhem Vellut from Annecy, France / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Landmark_Plaza_@_Yokohama_(9052264087).jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| Yokohama Landmark Plaza (Baby Rest Room) | yokohama | experience | 3 (jpg) | commons.wikimedia.org | CC BY 2.0 | Guilhem Vellut from Annecy, France | Photo: Guilhem Vellut from Annecy, France / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Landmark_Plaza_@_Yokohama_(9052265173).jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| Ichizawa Shinzaburo Hanpu | kyoto | shopping | 2 (jpg) | commons.wikimedia.org | CC BY 3.0 | tanohei | Photo: tanohei / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:%E4%B8%80%E6%BE%A4%E5%B8%86%E5%B8%831905.jpg), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) |
| Isezakicho Mall | yokohama | shopping | 1 (jpg) | commons.wikimedia.org | CC BY-SA 3.0 | Kimjun | Photo: Kimjun / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:%E4%BC%8A%E5%8B%A2%E4%BD%90%E6%9C%A8%E7%94%BA2012%E5%B9%B48%E6%9C%8824%E6%97%A5(%E9%87%91).jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| Shimokitazawa Vintage Shops | tokyo | shopping | 1 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | Aw1805 | Photo: Aw1805 / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Shimokitazawa_Street_2015.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Arima Onsen Kin no Yu (public bath) | daytrip | experience | 1 (jpg) | commons.wikimedia.org | CC BY 2.5 | 663highland | Photo: 663highland / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:170811_Rokko-Arima_Ropeway_Kobe_Japan00n.jpg), [CC BY 2.5](https://creativecommons.org/licenses/by/2.5) |
| Ippodo Tea Kyoto Main Store | kyoto | shopping | 1 (jpg) | commons.wikimedia.org | CC BY 2.0 | yomi955 from Japanese green tea established shop Ippodo-Tea Co. in Nakagyo, Kyoto | Photo: yomi955 from Japanese green tea established shop Ippodo-Tea Co. in Nakagyo, Kyoto / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Japanese_tea_established_shop_by_yomi955_in_Kyoto.jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| Yokohama Museum of Art | yokohama | sight | 2 (jpg) | commons.wikimedia.org | CC BY-SA 3.0 | Wiiii | Photo: Wiiii / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Yokohama_Museum_of_Art_2009.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| Yokohama Museum of Art | yokohama | sight | 3 (jpg) | commons.wikimedia.org | CC BY-SA 3.0 | TYORON2 | Photo: TYORON2 / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Yokohama_museum_of_art.JPG), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| Enoshima Aquarium | daytrip | experience | 3 (jpg) | commons.wikimedia.org | CC BY 4.0 | Nesnad | Photo: Nesnad / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Enoshima_Aquarium_front_2025_March_21_various_19_35_29_446000.jpeg), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| Queen's Square Yokohama | yokohama | shopping | 1 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | Kakidai | Photo: Kakidai / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:2024_Queens_Square_Yokohama.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Queen's Square Yokohama | yokohama | shopping | 2 (jpg) | commons.wikimedia.org | CC BY 2.0 | Guilhem Vellut from Annecy, France | Photo: Guilhem Vellut from Annecy, France / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Queen%27s_Square_@_Yokohama_(9054521364).jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| Queen's Square Yokohama | yokohama | shopping | 3 (jpg) | commons.wikimedia.org | CC BY 4.0 | Wpcpey | Photo: Wpcpey / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Queen%27s_Square_YOKOHAMA_Atrium_2015.jpg), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| Amanohashidate View Land | daytrip | sight | 1 (jpg) | commons.wikimedia.org | CC BY 4.0 | ブルーノ・プラス | Photo: ブルーノ・プラス / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Amanohashidate_View_Land_Slope_car2.jpg), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| Amanohashidate View Land | daytrip | sight | 2 (jpg) | commons.wikimedia.org | CC BY 4.0 | ブルーノ・プラス | Photo: ブルーノ・プラス / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Amanohashidate_View_Land_Slope_car.jpg), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| Amanohashidate View Land | daytrip | sight | 3 (jpg) | commons.wikimedia.org | CC BY 2.5 | 663highland | Photo: 663highland / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Amanohashidate_View_Land07n4592.jpg), [CC BY 2.5](https://creativecommons.org/licenses/by/2.5) |
| Hankyu Umeda Main Store (Depachika) | osaka | shopping | 1 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | Kanchi1979 | Photo: Kanchi1979 / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:JP-Osaka-Umeda-Hankyu-Department-Store.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Hankyu Umeda Main Store (Depachika) | osaka | shopping | 2 (jpg) | commons.wikimedia.org | CC BY-SA 3.0 | Mr.ちゅらさん | Photo: Mr.ちゅらさん / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Hankyu_Umeda_2026-07.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| Yokohama Anpanman Children's Museum & Mall | yokohama | experience | 1 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | Thirteen-fri | Photo: Thirteen-fri / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Yokohama_Anpanman_Children%27s_Museum_%26_Mall_2c.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Yokohama Anpanman Children's Museum & Mall | yokohama | experience | 2 (jpg) | commons.wikimedia.org | CC BY-SA 3.0 | Thirteen-fri | Photo: Thirteen-fri / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Yokohama_Anpanman_Children%27s_Museum_%26_Mall_2.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| Yokohama Anpanman Children's Museum & Mall | yokohama | experience | 3 (jpg) | commons.wikimedia.org | CC BY-SA 3.0 | Thirteen-fri | Photo: Thirteen-fri / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Yokohama_Anpanman_Children%27s_Museum_%26_Mall_(night)_1.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| Hikawa Maru | yokohama | sight | 1 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | Ymblanter | Photo: Ymblanter / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Yokohama_Hikawa_Maru_seen_from_the_southwest.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Yokohama World Porters | yokohama | shopping | 2 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | Tokumeigakarinoaoshima | Photo: Tokumeigakarinoaoshima / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Yokohama_World_Porters_on_23rd_June_2024.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Yokohama World Porters | yokohama | shopping | 3 (jpg) | commons.wikimedia.org | CC BY-SA 3.0 | Kakidai | Photo: Kakidai / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Yokohama_World_Porters.JPG), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| Yokohama Marine Tower | yokohama | sight | 1 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | NEO-NEED | Photo: NEO-NEED / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Yokohama_Marine_Tower_2022_-_01.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Yokohama Marine Tower | yokohama | sight | 2 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | Suicasmo | Photo: Suicasmo / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Yokohama_Marine_Tower_20211225.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Yokohama Marine Tower | yokohama | sight | 3 (jpg) | commons.wikimedia.org | CC BY-SA 3.0 | Kakidai | Photo: Kakidai / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Yokohama_Marine_Tower_2013.JPG), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| Ameyoko Shopping Street | tokyo | shopping | 1 (jpg) | commons.wikimedia.org | CC BY 2.0 | Guilhem Vellut from Annecy, France | Photo: Guilhem Vellut from Annecy, France / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Ameyoko_Shopping_Street_@_Ueno_(9254214098).jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| Ameyoko Shopping Street | tokyo | shopping | 2 (jpg) | commons.wikimedia.org | CC BY 2.5 | 663highland | Photo: 663highland / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Ameya-yokocho01s5s3200.jpg), [CC BY 2.5](https://creativecommons.org/licenses/by/2.5) |
| Hokokuji (Bamboo Temple) | daytrip | sight | 3 (jpg) | commons.wikimedia.org | CC BY-SA 2.0 | KimonBerlin | Photo: KimonBerlin / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Hokokuji_bamboo_forest_(5712271526).jpg), [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) |
| Den Den Town (Nipponbashi) | osaka | shopping | 3 (jpg) | commons.wikimedia.org | CC BY 2.5 | Oilstreet | Photo: Oilstreet / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Nipponbashi_Osaka_Japan01-r.jpg), [CC BY 2.5](https://creativecommons.org/licenses/by/2.5) |
| Hase-dera Temple | daytrip | sight | 1 (jpg) | commons.wikimedia.org | CC BY 2.5 | 663highland | Photo: 663highland / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Hasedera_Sakurai_Nara_pref58s5s4272.jpg), [CC BY 2.5](https://creativecommons.org/licenses/by/2.5) |
| Hase-dera Temple | daytrip | sight | 2 (jpg) | commons.wikimedia.org | CC BY-SA 3.0 | Bernard Gagnon | Photo: Bernard Gagnon / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Hase-dera.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| Sogo Yokohama food hall (depachika) | yokohama | shopping | 1 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | Sakura Torch | Photo: Sakura Torch / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Sogo_Yokohama.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Hara Model Railway Museum | yokohama | experience | 1 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | Suicasmo | Photo: Suicasmo / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Hara_Model_Railway_Museum_20221127.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Hara Model Railway Museum | yokohama | experience | 2 (jpg) | commons.wikimedia.org | CC BY 2.1 jp | rtaimeshi | Photo: rtaimeshi / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Hara_Model_Railway_Museum_entrance_20120711.jpg), [CC BY 2.1 jp](https://creativecommons.org/licenses/by/2.1/jp/deed.en) |
| Shinsaibashi-suji Shopping Street | osaka | shopping | 1 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | Mc681 | Photo: Mc681 / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Shinsaibashi-suji_201408.JPG), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Shinsaibashi-suji Shopping Street | osaka | shopping | 3 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | Don Ramey Logan | Photo: Don Ramey Logan / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Shinsaibashi_Suji_Shopping_Street_Osaka_Japan_by_Don_Ramey_Logan.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Coredo Muromachi and Nihonbashi | tokyo | shopping | 1 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | Kentin | Photo: Kentin / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Coredo_muromachi_3_nihonbashi_tokyo_2014.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| Coredo Muromachi and Nihonbashi | tokyo | shopping | 2 (jpg) | commons.wikimedia.org | CC BY-SA 4.0 | Kentin | Photo: Kentin / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Coredo_muromachi_nihonbashi_tokyo_2014.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |

## Group C: not free / unverified

Licence for every row: **not verified, all rights reserved unless the owner says otherwise.** "Host / URL" is where I found byte-identical content (or, for Instagram, the post whose embed image it is).

### Instagram post image (9 files)

| Card | City | Category | File (n) | Host | URL | Licence | Credit line |
|---|---|---|---:|---|---|---|---|
| Cafe Stand 10.8 | daytrip | cafe | 1 (jpg) | instagram.com | https://www.instagram.com/reel/DdjVOtvSr-Y/?xtok=MW0ybDdyOTk2N3RqMw== | Unverified, all rights reserved | none available |
| Coffee Shop Pinocchio | tokyo | cafe | 1 (jpg) | instagram.com | https://www.instagram.com/reel/DfALaxSh1r-/?cplk=MWx2b3RtZmw3aW83Yg== | Unverified, all rights reserved | none available |
| Don Quijote Dotonbori Ferris Wheel (Ebisu Tower) | osaka | experience | 1 (jpg) | instagram.com | https://www.instagram.com/reel/DewnTzbzd81/?srtk=MWRhZm1qY3FhZzJuYw== | Unverified, all rights reserved | none available |
| Matsubara-dori | kyoto | sight | 1 (jpg) | instagram.com | https://www.instagram.com/reel/Dbn1-CmzOqO/?dlrf=NWZwMzA4cm9peW5m | Unverified, all rights reserved | none available |
| MooKEN | osaka | food | 1 (jpg) | instagram.com | https://www.instagram.com/reel/DeF3dZFpbIK/?xtok=dmMybWp6YWpkamN4 | Unverified, all rights reserved | none available |
| Ninenzaka & Sannenzaka | kyoto | sight | 1 (jpg) | instagram.com | https://www.instagram.com/reel/Dbn1-CmzOqO/?dlrf=NWZwMzA4cm9peW5m | Unverified, all rights reserved | none available |
| Panel Cafe Kyoto | kyoto | cafe | 1 (jpg) | instagram.com | https://www.instagram.com/reel/Dezb2O-hJEG/?dlrf=MWw3dXAwNXR5YWNtcw== | Unverified, all rights reserved | none available |
| Pizza Marumo | tokyo | food | 1 (jpg) | instagram.com | https://www.instagram.com/reel/DcEKxGcNBqF/?cplk=cDRwYXd2OGZtZnVo | Unverified, all rights reserved | none available |
| Yakiniku HIRO Shoten Shijo Takakura | kyoto | food | 1 (jpg) | instagram.com | https://www.instagram.com/p/DfB67dACPYM/?img_index=6&obrf=amR5M21wMDNsNmUw | Unverified, all rights reserved | none available |

### Tabelog (10 files)

| Card | City | Category | File (n) | Host | URL | Licence | Credit line |
|---|---|---|---:|---|---|---|---|
| CHIKICHIKI Tenma | osaka | food | 1 (jpg) | tblg.k-img.com (Tabelog) | https://tblg.k-img.com/restaurant/images/Rvw/274710/640x640_rect_746e810b20eaa64dd92d36b757f6854c.jpg | Unverified, all rights reserved | none available |
| CHIKICHIKI Tenma | osaka | food | 2 (jpg) | tblg.k-img.com (Tabelog) | https://tblg.k-img.com/restaurant/images/Rvw/304690/640x640_rect_a16dac42a09fdb3e1e16b1cc5ba91be5.jpg | Unverified, all rights reserved | none available |
| KYOTO STAR BAR | kyoto | nightlife | 3 (jpg) | tblg.k-img.com (Tabelog) | https://tblg.k-img.com/restaurant/images/Rvw/350638/640x640_rect_167feaa7dff07cdc99e01840fd674af5.jpg | Unverified, all rights reserved | none available |
| Kaisen Sosaku Kuriki | osaka | food | 1 (jpg) | tblg.k-img.com (Tabelog) | https://tblg.k-img.com/restaurant/images/Rvw/240289/640x640_rect_ed6a66f0a52cdd27e384eb36e9b9b3ac.jpg | Unverified, all rights reserved | none available |
| Sushi Sakaba Maguro Ittetsu (Umeda DD House) | osaka | food | 1 (jpg) | tblg.k-img.com (Tabelog) | https://tblg.k-img.com/resize/640x640c/restaurant/images/Rvw/315078/4ac455dce8e4f2180ffafefdde9c4fb4.jpg | Unverified, all rights reserved | none available |
| Sushi Sakaba Maguro Ittetsu (Umeda DD House) | osaka | food | 2 (jpg) | tblg.k-img.com (Tabelog) | https://tblg.k-img.com/restaurant/images/Rvw/315078/640x640_rect_4ac455dce8e4f2180ffafefdde9c4fb4.jpg | Unverified, all rights reserved | none available |
| Sushi Sakaba Maguro Ittetsu (Umeda DD House) | osaka | food | 3 (jpg) | tblg.k-img.com (Tabelog) | https://tblg.k-img.com/restaurant/images/Rvw/354712/7ab193307f31d6d89bdfe0411294d341.jpg | Unverified, all rights reserved | none available |
| Yakiniku Hanamichi | osaka | food | 1 (jpg) | tblg.k-img.com (Tabelog) | https://tblg.k-img.com/restaurant/images/Rvw/54095/54095594.jpg | Unverified, all rights reserved | none available |
| Yakiniku Hanamichi | osaka | food | 2 (jpg) | tblg.k-img.com (Tabelog) | https://tblg.k-img.com/resize/640x640c/restaurant/images/Rvw/92595/92595910.jpg | Unverified, all rights reserved | none available |
| Yakiniku Hanamichi | osaka | food | 3 (jpg) | tblg.k-img.com (Tabelog) | https://tblg.k-img.com/restaurant/images/Rvw/92595/640x640_rect_92595910.jpg | Unverified, all rights reserved | none available |

### Official website (8 files)

| Card | City | Category | File (n) | Host | URL | Licence | Credit line |
|---|---|---|---:|---|---|---|---|
| Kenchoji Temple | daytrip | sight | 1 (jpg) | kenchoji.com | https://www.kenchoji.com/ | Unverified, all rights reserved | none available |
| MARK IS Minatomirai | yokohama | shopping | 3 (jpg) | mec-markis.jp | https://www.mec-markis.jp/mm/ | Unverified, all rights reserved | none available |
| Nogeyama Zoo | yokohama | sight | 1 (png) | hama-midorinokyokai.or.jp | https://www.hama-midorinokyokai.or.jp/zoo/nogeyama/ | Unverified, all rights reserved | none available |
| Roppongi Hills Christmas Market | tokyo | shopping | 1 (jpg) | roppongihills.com | https://www.roppongihills.com/ | Unverified, all rights reserved | none available |
| YORUNOYO 2026 (Yokohama harbour illumination) | yokohama | experience | 1 (webp) | en.yorunoyo.yokohama | https://en.yorunoyo.yokohama/ | Unverified, all rights reserved | none available |
| Yokohama Museum of Art | yokohama | sight | 1 (jpg) | yokohama.art.museum | https://yokohama.art.museum/eng/ | Unverified, all rights reserved | none available |
| Yokohama Red Brick Warehouse | yokohama | shopping | 1 (png) | yokohama-akarenga.jp | https://www.yokohama-akarenga.jp/ | Unverified, all rights reserved | none available |
| Zoorasia (Yokohama Zoological Gardens) | yokohama | experience | 1 (png) | hama-midorinokyokai.or.jp | https://www.hama-midorinokyokai.or.jp/zoo/zoorasia/ | Unverified, all rights reserved | none available |

### Official website (field points to a tourism-portal page) (1 files)

| Card | City | Category | File (n) | Host | URL | Licence | Credit line |
|---|---|---|---:|---|---|---|---|
| Hokokuji (Bamboo Temple) | daytrip | sight | 1 (jpg) | visitkanagawa.jp | https://visitkanagawa.jp/destination/hokoku-ji-temple/162 | Unverified, all rights reserved | none available |

### Other web page (75 files)

| Card | City | Category | File (n) | Host | URL | Licence | Credit line |
|---|---|---|---:|---|---|---|---|
| Akachan Honpo | tokyo | shopping | 1 (webp) | gltjp.com | https://www.gltjp.com/en/article/item/21495/ | Unverified, all rights reserved | none available |
| Alpen TOKYO | tokyo | shopping | 1 (jpg) | rurubu.jp | https://rurubu.jp/andmore/spot/80133524 | Unverified, all rights reserved | none available |
| Alpen TOKYO | tokyo | shopping | 2 (jpg) | rurubu.jp | https://rurubu.jp/andmore/spot/80133524 | Unverified, all rights reserved | none available |
| Alpen TOKYO | tokyo | shopping | 3 (jpg) | rurubu.jp | https://rurubu.jp/andmore/spot/80133524 | Unverified, all rights reserved | none available |
| Amerikamura (Amemura) | osaka | shopping | 1 (jpg) | osakatourism.org | https://www.osakatourism.org/amerikamura-guide/ | Unverified, all rights reserved | none available |
| Amerikamura (Amemura) | osaka | shopping | 2 (jpg) | osakatourism.org | https://www.osakatourism.org/amerikamura-guide/ | Unverified, all rights reserved | none available |
| Amerikamura (Amemura) | osaka | shopping | 3 (jpg) | osakatourism.org | https://www.osakatourism.org/amerikamura-guide/ | Unverified, all rights reserved | none available |
| Ameyoko Shopping Street | tokyo | shopping | 3 (jpg) | tohokuandtokyo.org | https://www.tohokuandtokyo.org/spot_50 | Unverified, all rights reserved | none available |
| Aritsugu | kyoto | shopping | 2 (jpg) | afar.com | https://www.afar.com/places/aritsugu-kyoto | Unverified, all rights reserved | none available |
| Aritsugu | kyoto | shopping | 3 (jpg) | afar.com | https://www.afar.com/places/aritsugu-kyoto | Unverified, all rights reserved | none available |
| Cupnoodles Museum Yokohama | yokohama | experience | 3 (webp) | gltjp.com | https://www.gltjp.com/en/directory/item/10066/ | Unverified, all rights reserved | none available |
| Daimaru Kyoto | kyoto | shopping | 3 (jpg) | insidekyoto.com | https://insidekyoto.com/daimaru-basement-food-floor-kyoto | Unverified, all rights reserved | none available |
| Den Den Town (Nipponbashi) | osaka | shopping | 1 (jpg) | japannook.com | https://japannook.com/uploads/content_01_3434f68688.jpg | Unverified, all rights reserved | none available |
| Den Den Town (Nipponbashi) | osaka | shopping | 2 (jpg) | japannook.com | https://japannook.com/uploads/content_02_004779caeb.jpg | Unverified, all rights reserved | none available |
| Enoden (Kamakura to Hase scenic train) | daytrip | experience | 2 (jpg) | onedayawaytravel.com | https://onedayawaytravel.com/?p=1350 | Unverified, all rights reserved | none available |
| Enoshima Aquarium | daytrip | experience | 1 (jpg) | visitkanagawa.jp | https://visitkanagawa.jp/destination/enoshima-aquarium/309 | Unverified, all rights reserved | none available |
| Enoshima Aquarium | daytrip | experience | 2 (jpg) | visitkanagawa.jp | https://visitkanagawa.jp/destination/enoshima-aquarium/309 | Unverified, all rights reserved | none available |
| G. Itoya | tokyo | shopping | 1 (webp) | en.japantravel.com | https://en.japantravel.com/tokyo/stationery-heaven-at-itoya/29040 | Unverified, all rights reserved | none available |
| G. Itoya | tokyo | shopping | 2 (jpg) | en.japantravel.com | https://en.japantravel.com/tokyo/stationery-heaven-at-itoya/29040 | Unverified, all rights reserved | none available |
| G. Itoya | tokyo | shopping | 3 (jpg) | jw-webmagazine.com | https://jw-webmagazine.com/tips/ginza-itoya | Unverified, all rights reserved | none available |
| Gotemba Premium Outlets | daytrip | shopping | 1 (jpg) | en.japantravel.com | https://en.japantravel.com/shizuoka/shop-at-gotemba-s-premium-outlets/23654 | Unverified, all rights reserved | none available |
| Gotemba Premium Outlets | daytrip | shopping | 2 (webp) | en.japantravel.com | https://en.japantravel.com/shizuoka/shop-at-gotemba-s-premium-outlets/23654 | Unverified, all rights reserved | none available |
| Hikawa Maru | yokohama | sight | 3 (jpg) | visitkanagawa.jp (page trip.pref.kanagawa.jp/destination/hikawa-maru/416) | https://visitkanagawa.jp/legacy-assets/img/spots/photos/hero/1739f840a8826b98136d8d3242aaab3c-1920x1080.jpg | Unverified, all rights reserved | none available |
| Ichizawa Shinzaburo Hanpu | kyoto | shopping | 1 (jpg) | rli.uk.com | https://www.rli.uk.com/online-store-launched-by-ichizawa-shinzaburo-hanpu-kyoto/ | Unverified, all rights reserved | none available |
| KYOTO STAR BAR | kyoto | nightlife | 1 (jpg) | enprimeurclub.com | https://www.enprimeurclub.com/restaurants/kyoto-star-bar-26027655 | Unverified, all rights reserved | none available |
| KYOTO STAR BAR | kyoto | nightlife | 2 (jpg) | enprimeurclub.com | https://www.enprimeurclub.com/restaurants/kyoto-star-bar-26027655 | Unverified, all rights reserved | none available |
| Kappabashi Dougu Street | tokyo | shopping | 1 (webp) | gltjp.com | https://www.gltjp.com/en/article/item/11601 | Unverified, all rights reserved | none available |
| Kappabashi Dougu Street | tokyo | shopping | 2 (webp) | gltjp.com | https://www.gltjp.com/en/article/item/11601 | Unverified, all rights reserved | none available |
| Kappabashi Dougu Street | tokyo | shopping | 3 (webp) | gltjp.com | https://www.gltjp.com/en/article/item/11601 | Unverified, all rights reserved | none available |
| Kenchoji Temple | daytrip | sight | 2 (webp) | japanactivity.com | https://japanactivity.com/kenchoji-temple-kamakura | Unverified, all rights reserved | none available |
| Kenchoji Temple | daytrip | sight | 3 (jpg) | japanactivity.com | https://japanactivity.com/kenchoji-temple-kamakura | Unverified, all rights reserved | none available |
| Kyoto Handicraft Center | kyoto | shopping | 2 (png) | wanderlog.com | https://wanderlog.com/place/details/425892/kyoto-handicraft-center | Unverified, all rights reserved | none available |
| MARK IS Minatomirai | yokohama | shopping | 1 (webp) | gltjp.com | https://gltjp.com/en/directory/item/16142 | Unverified, all rights reserved | none available |
| MEGA Don Quijote Shibuya | tokyo | shopping | 1 (jpg) | tsunagujapan.com | https://www.tsunagujapan.com/mega-don-quijote-shibuya-tokyo-s-largest-selection-of-souvenirs-at-bargain-prices/ | Unverified, all rights reserved | none available |
| MUJI Ginza Global Flagship Store | tokyo | shopping | 1 (webp) | en.jal.japantravel.com | https://en.jal.japantravel.com/tokyo/muji-hotel-ginza-global-flagship-store/59200 | Unverified, all rights reserved | none available |
| Misono Building (Ura Namba hidden bars) | osaka | nightlife | 1 (jpg) | wanderlog.com | https://wanderlog.com/place/details/2223953 | Unverified, all rights reserved | none available |
| Nakagawa Masashichi Shoten Nara Main Store | nara | shopping | 1 (webp) | gltjp.com | https://www.gltjp.com/en/directory/item/13204 | Unverified, all rights reserved | none available |
| Nakagawa Masashichi Shoten Nara Main Store | nara | shopping | 2 (webp) | gltjp.com | https://www.gltjp.com/en/directory/item/13204 | Unverified, all rights reserved | none available |
| Nakagawa Masashichi Shoten Nara Main Store | nara | shopping | 3 (jpg) | en.japaholic.com | https://en.japaholic.com/nakagawa-masashichi-shoten-fall-in-love-with-japanese-traditional-arts-and-crafts/ | Unverified, all rights reserved | none available |
| Ninenzaka & Sannenzaka | kyoto | sight | 2 (jpg) | kanpai-japan.com | https://www.kanpai-japan.com/kyoto/ninenzaka-sannenzaka | Unverified, all rights reserved | none available |
| Ninenzaka & Sannenzaka | kyoto | sight | 3 (jpg) | kanpai-japan.com | https://www.kanpai-japan.com/kyoto/ninenzaka-sannenzaka | Unverified, all rights reserved | none available |
| Nogeyama Zoo | yokohama | sight | 2 (webp) | gltjp.com | https://www.gltjp.com/en/directory/item/10151/ | Unverified, all rights reserved | none available |
| RUCY+R | yokohama | food | 1 (jpg) | rurubu.jp | https://rurubu.jp/andmore/article/20983 | Unverified, all rights reserved | none available |
| RUCY+R | yokohama | food | 2 (jpg) | en.japantravel.com | https://en.japantravel.com/places/kanagawa/peace-cafe/729 | Unverified, all rights reserved | none available |
| RUCY+R | yokohama | food | 3 (webp) | en.japantravel.com | https://en.japantravel.com/places/kanagawa/peace-cafe/729 | Unverified, all rights reserved | none available |
| Roppongi Hills Christmas Market | tokyo | shopping | 2 (jpg) | essential-japan.com | https://essential-japan.com/events-archive/roppongi-hills-christmas-market/ | Unverified, all rights reserved | none available |
| Roppongi Hills Christmas Market | tokyo | shopping | 3 (webp) | essential-japan.com | https://essential-japan.com/events-archive/roppongi-hills-christmas-market/ | Unverified, all rights reserved | none available |
| Sankeien Garden | yokohama | sight | 1 (jpg) | trip.pref.kanagawa.jp | https://trip.pref.kanagawa.jp/destination/sankeien-garden/90 | Unverified, all rights reserved | none available |
| Sennichimae Doguyasuji Shopping Street | osaka | shopping | 1 (jpg) | metronine.osaka | https://metronine.osaka/en/article_tour/osaka-is-kitchen-street/ | Unverified, all rights reserved | none available |
| Sennichimae Doguyasuji Shopping Street | osaka | shopping | 2 (jpg) | timeout.com | https://www.timeout.com/osaka/shopping/sennichimae-doguyasuji-kitchenware-shopping-street | Unverified, all rights reserved | none available |
| Sennichimae Doguyasuji Shopping Street | osaka | shopping | 3 (jpg) | timeout.com | https://www.timeout.com/osaka/shopping/sennichimae-doguyasuji-kitchenware-shopping-street | Unverified, all rights reserved | none available |
| Shinsaibashi-suji Shopping Street | osaka | shopping | 2 (jpg) | media.magical-trip.com | https://media.magical-trip.com/shinsaibashi-suji-shopping-street-enjoy-fashion-cosmetics-and-osaka-cuisines | Unverified, all rights reserved | none available |
| Starbucks Coffee – Kyoto Nineizaka Yasaka Chaya | kyoto | cafe | 1 (jpg) | kanpai-japan.com | https://www.kanpai-japan.com/kyoto/starbucks-ninenzaka-yasaka-chaya | Unverified, all rights reserved | none available |
| Starbucks Coffee – Kyoto Nineizaka Yasaka Chaya | kyoto | cafe | 2 (jpg) | kanpai-japan.com | https://www.kanpai-japan.com/kyoto/starbucks-ninenzaka-yasaka-chaya | Unverified, all rights reserved | none available |
| Starbucks Coffee – Kyoto Nineizaka Yasaka Chaya | kyoto | cafe | 3 (jpg) | kanpai-japan.com | https://www.kanpai-japan.com/kyoto/starbucks-ninenzaka-yasaka-chaya | Unverified, all rights reserved | none available |
| Takeshita Street | tokyo | shopping | 1 (jpg) | aglobewelltravelled.com | https://aglobewelltravelled.com/2025/06/27/things-to-do-in-harajuku-tokyo/ | Unverified, all rights reserved | none available |
| Takeshita Street | tokyo | shopping | 2 (jpg) | aglobewelltravelled.com | https://aglobewelltravelled.com/2025/06/27/things-to-do-in-harajuku-tokyo/ | Unverified, all rights reserved | none available |
| Takeshita Street | tokyo | shopping | 3 (jpg) | travelgasm.com | https://travelgasm.com/tokyo-japan/takeshita-street-omotesando-avenue-cat-street-meiji-jingu-harajuku-tokyo-japan.html | Unverified, all rights reserved | none available |
| Tenjinbashisuji Shopping Street | osaka | shopping | 1 (jpg) | osaka-info.jp | https://osaka-info.jp/en/spot/tenjimbashisuji-shopping-street/ | Unverified, all rights reserved | none available |
| Teramachi and Shinkyogoku Shopping Arcades | kyoto | shopping | 1 (jpg) | insidekyoto.com | https://www.insidekyoto.com/teramachi-shinkyogoku-shopping-arcades-kyoto | Unverified, all rights reserved | none available |
| Teramachi and Shinkyogoku Shopping Arcades | kyoto | shopping | 2 (jpg) | kanpai-japan.com | https://www.kanpai-japan.com/kyoto/teramachi | Unverified, all rights reserved | none available |
| Tokyo City Flea Market | tokyo | shopping | 1 (jpg) | timeout.com | https://www.timeout.com/tokyo/shopping/oi-racecourse-flea-market | Unverified, all rights reserved | none available |
| Tokyo City Flea Market | tokyo | shopping | 2 (jpg) | atinydreamer.com | https://www.atinydreamer.com/is-the-tokyo-city-flea-market-worth-it-full-guide/ | Unverified, all rights reserved | none available |
| Tsurugaoka Hachimangu Shrine | daytrip | sight | 3 (jpg) | japan-guide.com | https://www.japan-guide.com/e/e3102.html | Unverified, all rights reserved | none available |
| Umeda Sky Building Christmas Market (Wonder Christmas Marche) | osaka | shopping | 1 (jpg) | fun-japan.jp | https://www.fun-japan.jp/en/articles/14277 | Unverified, all rights reserved | none available |
| Vee Sweets CAFE YOKOHAMA | yokohama | cafe | 1 (jpg) | voix.jp | https://voix.jp/life/?p=47276 | Unverified, all rights reserved | none available |
| Vee Sweets CAFE YOKOHAMA | yokohama | cafe | 2 (jpg) | co-trip.jp | https://co-trip.jp/article/682242 | Unverified, all rights reserved | none available |
| Yokohama Air Cabin | yokohama | experience | 1 (jpg) | visitkanagawa.jp | https://visitkanagawa.jp/destination/yokohama-air-cabin | Unverified, all rights reserved | none available |
| Yokohama Air Cabin | yokohama | experience | 2 (webp) | gltjp.com | https://www.gltjp.com/en/directory/item/12325/ | Unverified, all rights reserved | none available |
| Yokohama Hakkeijima Sea Paradise | yokohama | experience | 1 (jpg) | japan-guide.com | https://www.japan-guide.com/e/e3213.html | Unverified, all rights reserved | none available |
| Yokohama Red Brick Warehouse | yokohama | shopping | 2 (jpg) | haveagood-holiday.com | https://www.haveagood-holiday.com/en/articles/yokohama-red-brick-warehouse-christmas-market-2026 | Unverified, all rights reserved | none available |
| Yokohama Red Brick Warehouse | yokohama | shopping | 3 (jpg) | haveagood-holiday.com | https://www.haveagood-holiday.com/en/articles/yokohama-red-brick-warehouse-christmas-market-2026 | Unverified, all rights reserved | none available |
| Yokohama World Porters | yokohama | shopping | 1 (webp) | gltjp.com | https://www.gltjp.com/en/directory/item/14085/ | Unverified, all rights reserved | none available |
| Zoorasia (Yokohama Zoological Gardens) | yokohama | experience | 2 (jpg) | trip.pref.kanagawa.jp | https://trip.pref.kanagawa.jp/destination/yokohama-zoological-gardens-zoorasia/302 | Unverified, all rights reserved | none available |
| Zoorasia (Yokohama Zoological Gardens) | yokohama | experience | 3 (jpg) | trip.pref.kanagawa.jp | https://trip.pref.kanagawa.jp/destination/yokohama-zoological-gardens-zoorasia/302 | Unverified, all rights reserved | none available |

### Origin unknown (6 files)

| Card | City | Category | File (n) | Host | URL | Licence | Credit line |
|---|---|---|---:|---|---|---|---|
| Kyoto Gyoza enen Gion Main Branch | kyoto | food | 1 (jpg) | - | - | Unverified, all rights reserved | none available |
| Kyoto Gyoza enen Gion Main Branch | kyoto | food | 2 (jpg) | - | - | Unverified, all rights reserved | none available |
| Kyoto Gyoza enen Gion Main Branch | kyoto | food | 3 (jpg) | - | - | Unverified, all rights reserved | none available |
| Kyoto Handicraft Center | kyoto | shopping | 1 (png) | - | - | Unverified, all rights reserved | none available |
| Matsubara-dori | kyoto | sight | 2 (webp) | - | - | Unverified, all rights reserved | none available |
| Matsubara-dori | kyoto | sight | 3 (webp) | - | - | Unverified, all rights reserved | none available |

## Cards whose every photo is not free (icon-tile fallback)

38 of 84 cards. If only group A and B photos are shown, these would fall back to the icon tile.

| Card | City | Category | Photos | Origins |
|---|---|---|---:|---|
| MooKEN | osaka | food | 1 | Instagram post image |
| Zoorasia (Yokohama Zoological Gardens) | yokohama | experience | 3 | Official website (hama-midorinokyokai.or.jp), Other web page (trip.pref.kanagawa.jp) |
| Kappabashi Dougu Street | tokyo | shopping | 3 | Other web page (gltjp.com) |
| Panel Cafe Kyoto | kyoto | cafe | 1 | Instagram post image |
| Alpen TOKYO | tokyo | shopping | 3 | Other web page (rurubu.jp) |
| Tokyo City Flea Market | tokyo | shopping | 2 | Other web page (atinydreamer.com), Other web page (timeout.com) |
| Kaisen Sosaku Kuriki | osaka | food | 1 | Tabelog |
| Yakiniku Hanamichi | osaka | food | 3 | Tabelog |
| RUCY+R | yokohama | food | 3 | Other web page (en.japantravel.com), Other web page (rurubu.jp) |
| Coffee Shop Pinocchio | tokyo | cafe | 1 | Instagram post image |
| Don Quijote Dotonbori Ferris Wheel (Ebisu Tower) | osaka | experience | 1 | Instagram post image |
| Nakagawa Masashichi Shoten Nara Main Store | nara | shopping | 3 | Other web page (en.japaholic.com), Other web page (gltjp.com) |
| Kenchoji Temple | daytrip | sight | 3 | Official website (kenchoji.com), Other web page (japanactivity.com) |
| Amerikamura (Amemura) | osaka | shopping | 3 | Other web page (osakatourism.org) |
| Cafe Stand 10.8 | daytrip | cafe | 1 | Instagram post image |
| KYOTO STAR BAR | kyoto | nightlife | 3 | Other web page (enprimeurclub.com), Tabelog |
| Yokohama Red Brick Warehouse | yokohama | shopping | 3 | Official website (yokohama-akarenga.jp), Other web page (haveagood-holiday.com) |
| Ninenzaka & Sannenzaka | kyoto | sight | 3 | Instagram post image, Other web page (kanpai-japan.com) |
| Pizza Marumo | tokyo | food | 1 | Instagram post image |
| CHIKICHIKI Tenma | osaka | food | 2 | Tabelog |
| Vee Sweets CAFE YOKOHAMA | yokohama | cafe | 2 | Other web page (co-trip.jp), Other web page (voix.jp) |
| Sennichimae Doguyasuji Shopping Street | osaka | shopping | 3 | Other web page (metronine.osaka), Other web page (timeout.com) |
| YORUNOYO 2026 (Yokohama harbour illumination) | yokohama | experience | 1 | Official website (en.yorunoyo.yokohama) |
| Akachan Honpo | tokyo | shopping | 1 | Other web page (gltjp.com) |
| Starbucks Coffee – Kyoto Nineizaka Yasaka Chaya | kyoto | cafe | 3 | Other web page (kanpai-japan.com) |
| Teramachi and Shinkyogoku Shopping Arcades | kyoto | shopping | 2 | Other web page (insidekyoto.com), Other web page (kanpai-japan.com) |
| Roppongi Hills Christmas Market | tokyo | shopping | 3 | Official website (roppongihills.com), Other web page (essential-japan.com) |
| Sushi Sakaba Maguro Ittetsu (Umeda DD House) | osaka | food | 3 | Tabelog |
| Tenjinbashisuji Shopping Street | osaka | shopping | 1 | Other web page (osaka-info.jp) |
| Kyoto Gyoza enen Gion Main Branch | kyoto | food | 3 | Origin unknown |
| MEGA Don Quijote Shibuya | tokyo | shopping | 1 | Other web page (tsunagujapan.com) |
| Kyoto Handicraft Center | kyoto | shopping | 2 | Origin unknown, Other web page (wanderlog.com) |
| MUJI Ginza Global Flagship Store | tokyo | shopping | 1 | Other web page (en.jal.japantravel.com) |
| Yakiniku HIRO Shoten Shijo Takakura | kyoto | food | 1 | Instagram post image |
| G. Itoya | tokyo | shopping | 3 | Other web page (en.japantravel.com), Other web page (jw-webmagazine.com) |
| Takeshita Street | tokyo | shopping | 3 | Other web page (aglobewelltravelled.com), Other web page (travelgasm.com) |
| Misono Building (Ura Namba hidden bars) | osaka | nightlife | 1 | Other web page (wanderlog.com) |
| Matsubara-dori | kyoto | sight | 3 | Instagram post image, Origin unknown |

For comparison: 25 cards have only free-licence photos (groups A and B); 21 cards mix free and unverified photos.

### Fallback by category

| Category | Cards | Cards with every photo in group C | Files in group C |
|---|---:|---:|---:|
| cafe | 5 | 5 | 8 |
| experience | 16 | 3 | 12 |
| food | 9 | 9 | 18 |
| nightlife | 2 | 2 | 4 |
| shopping | 37 | 16 | 51 |
| sight | 15 | 3 | 16 |

## Observations (file names only, I did not look at the pictures)

Reading the Commons file names of the matched images, these may not show the place on the card. Worth a manual look before relying on them:

- Daimaru Kyoto, photo 1: "DAIMARU Shinsaibashi Store Main Building" (the Osaka store; it was the lead image of the Japanese Wikipedia article about the Daimaru company).
- Hase-dera Temple (Kamakura), photo 1: "Hasedera Sakurai Nara pref" is the Hase-dera in Nara prefecture, not the one in Kamakura.
- Arima Onsen Kin no Yu, photo 1: "Rokko-Arima Ropeway" (the Arima onsen town article lead image, not the bath house).
- Aritsugu, photo 1: "Kitchen tools store by matsuyuki in Nishiki Ichiba, Kyoto" (the English article lead image; the file name does not name Aritsugu).
- Marine & Walk Yokohama, photos 2 and 3: file names name the InterContinental Yokohama Grand hotel and Hammerhead, which are neighbouring buildings.
- Two stored files are byte-identical copies of the same Instagram cover: Ninenzaka & Sannenzaka photo 1 and Matsubara-dori photo 1 (one reel, `Dbn1-CmzOqO`, which is also a source of Starbucks Coffee – Kyoto Nineizaka Yasaka Chaya).

## Not covered

`public/media.json` in the repo holds 107 places and 245 photos, all Google Maps user photos hotlinked from `lh3.googleusercontent.com`. They were not audited; they are third-party photos of unverified licence, hotlinked rather than stored.

## What I could not do

- TikTok: no card in this set matched a TikTok video link with a fetchable cover (only a TikTok discover page on one card), so no TikTok image could be compared.
- Several pages listed as sources returned 403/429 to a plainly identified client (tripadvisor.com, alamy.com, fodors.com, corner.inc, store.kyotohandicraftcenter.com, timeextension.com). The edge function sends the user agent `facebookexternalhit/1.1`; I did not imitate that, I used a descriptive user agent. The six "Origin unknown" files might come from those pages.
- Instagram and Tabelog images were matched only against what their pages return today.
- Commons licence data was read once from the API; it can change if an uploader edits the file page.
