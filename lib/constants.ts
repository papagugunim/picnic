export const CITIES = {
  MOSCOW: 'Moscow',
  SPB: 'Saint Petersburg'
} as const

export const MOSCOW_NEIGHBORHOODS = [
  { value: 'Arbat', label: 'Arbat (Арбат)', labelRu: 'Арбат' },
  { value: 'Tverskoy', label: 'Tverskoy (Тверской)', labelRu: 'Тверской' },
  { value: 'Presnensky', label: 'Presnensky (Пресненский)', labelRu: 'Пресненский' },
  { value: 'Khamovniki', label: 'Khamovniki (Хамовники)', labelRu: 'Хамовники' },
  { value: 'Zamoskvorechye', label: 'Zamoskvorechye (Замоскворечье)', labelRu: 'Замоскворечье' },
  { value: 'Basmanny', label: 'Basmanny (Басманный)', labelRu: 'Басманный' },
  { value: 'Tagansky', label: 'Tagansky (Таганский)', labelRu: 'Таганский' },
  { value: 'Yakimanka', label: 'Yakimanka (Якиманка)', labelRu: 'Якиманка' },
] as const

export const SPB_NEIGHBORHOODS = [
  { value: 'Nevsky', label: 'Nevsky District (Невский район)', labelRu: 'Невский район' },
  { value: 'Admiralteysky', label: 'Admiralteysky (Адмиралтейский)', labelRu: 'Адмиралтейский' },
  { value: 'Vasileostrovsky', label: 'Vasileostrovsky (Василеостровский)', labelRu: 'Василеостровский' },
  { value: 'Petrogradsky', label: 'Petrogradsky (Петроградский)', labelRu: 'Петроградский' },
  { value: 'Moskovsky', label: 'Moskovsky (Московский)', labelRu: 'Московский' },
] as const

export const CATEGORIES = [
  { value: 'electronics', label: '전자제품' },
  { value: 'furniture', label: '가구/인테리어' },
  { value: 'clothing', label: '의류/잡화' },
  { value: 'books', label: '도서' },
  { value: 'sports', label: '스포츠/레저' },
  { value: 'beauty', label: '뷰티/미용' },
  { value: 'baby', label: '유아동' },
  { value: 'food', label: '식품' },
  { value: 'other', label: '기타' },
] as const

export const CONDITIONS = [
  { value: 'new', label: '새상품' },
  { value: 'like_new', label: '거의 새것' },
  { value: 'good', label: '사용감 적음' },
  { value: 'fair', label: '사용감 많음' },
] as const

export const TRADE_METHODS = [
  { value: 'direct', label: '직거래' },
  { value: 'delivery', label: '택배' },
] as const

export const POST_STATUS = {
  ACTIVE: 'active',
  RESERVED: 'reserved',
  SOLD: 'sold',
  HIDDEN: 'hidden'
} as const

export const CONTACT_METHODS = [
  { value: 'chat', label: '피크닉 채팅' },
  { value: 'phone', label: '전화' },
  { value: 'telegram', label: '텔레그램' },
  { value: 'kakao', label: '카카오톡' },
] as const

// Moscow Metro Line Colors
export const MOSCOW_METRO_LINE_COLORS = {
  '1': '#ED1B35', // Red - Sokolnicheskaya
  '2': '#44B85C', // Green - Zamoskvoretskaya
  '3': '#0078C9', // Blue - Arbatsko-Pokrovskaya
  '4': '#19C1F3', // Light Blue - Filyovskaya
  '5': '#894E35', // Brown - Koltsevaya (Circle Line)
  '6': '#F58220', // Orange - Kaluzhsko-Rizhskaya
  '7': '#B51E7A', // Purple - Tagansko-Krasnopresnenskaya
  '8': '#FFCB31', // Yellow - Kalininskaya
  '9': '#A1A2A3', // Grey - Serpukhovsko-Timiryazevskaya
  '10': '#B3D445', // Light Green - Lyublinsko-Dmitrovskaya
  '11': '#82C0C0', // Turquoise - Bolshaya Koltsevaya (Big Circle Line)
  '12': '#ACBFE1', // Light Grey - Butovskaya
  '14': '#DE64A1', // Pink - Nekrasovskaya
  '15': '#FFD702', // Yellow-Gold - Solntsevskaya
} as const

// Moscow Metro Stations (전체 역 목록, 노선별 정렬)
export const MOSCOW_METRO_STATIONS = [
  // Line 1 (Sokolnicheskaya) - Red
  { value: 'Bulvar_Rokossovskogo', label: '불바르 로코솝스코보 / Бульвар Рокоссовского / Bulvar Rokossovskogo', line: '1', lineColor: '#ED1B35' },
  { value: 'Cherkizovskaya', label: '체르키좁스카야 / Черкизовская / Cherkizovskaya', line: '1', lineColor: '#ED1B35' },
  { value: 'Preobrazhenskaya_Ploshchad', label: '프레오브라젠스카야 광장 / Преображенская Площадь / Preobrazhenskaya Ploshchad', line: '1', lineColor: '#ED1B35' },
  { value: 'Sokolniki', label: '소콜니키 / Сокольники / Sokolniki', line: '1', lineColor: '#ED1B35' },
  { value: 'Krasnoselskaya', label: '크라스노셀스카야 / Красносельская / Krasnoselskaya', line: '1', lineColor: '#ED1B35' },
  { value: 'Komsomolskaya_1', label: '콤소몰스카야 / Комсомольская / Komsomolskaya', line: '1', lineColor: '#ED1B35' },
  { value: 'Krasnye_Vorota', label: '크라스니예 보로타 / Красные Ворота / Krasnye Vorota', line: '1', lineColor: '#ED1B35' },
  { value: 'Chistye_Prudy', label: '치스티예 프루디 / Чистые Пруды / Chistye Prudy', line: '1', lineColor: '#ED1B35' },
  { value: 'Lubyanka', label: '루비얀카 / Лубянка / Lubyanka', line: '1', lineColor: '#ED1B35' },
  { value: 'Okhotny_Ryad', label: '오호트니 랴드 / Охотный Ряд / Okhotny Ryad', line: '1', lineColor: '#ED1B35' },
  { value: 'Biblioteka_Lenina', label: '레닌 도서관 / Библиотека Ленина / Biblioteka Lenina', line: '1', lineColor: '#ED1B35' },
  { value: 'Kropotkinskaya', label: '크로포트킨스카야 / Кропоткинская / Kropotkinskaya', line: '1', lineColor: '#ED1B35' },
  { value: 'Park_Kultury_1', label: '파르크 쿨투리 / Парк Культуры / Park Kultury', line: '1', lineColor: '#ED1B35' },
  { value: 'Frunzenskaya', label: '프룬젠스카야 / Фрунзенская / Frunzenskaya', line: '1', lineColor: '#ED1B35' },
  { value: 'Sportivnaya', label: '스포르티브나야 / Спортивная / Sportivnaya', line: '1', lineColor: '#ED1B35' },
  { value: 'Vorobyovy_Gory', label: '보로브요비 고리 / Воробьёвы Горы / Vorobyovy Gory', line: '1', lineColor: '#ED1B35' },
  { value: 'Universitet', label: '우니베르시테트 / Университет / Universitet', line: '1', lineColor: '#ED1B35' },
  { value: 'Prospekt_Vernadskogo', label: '프로스펙트 베르나츠코보 / Проспект Вернадского / Prospekt Vernadskogo', line: '1', lineColor: '#ED1B35' },
  { value: 'Yugo_Zapadnaya', label: '유고-자파드나야 / Юго-Западная / Yugo-Zapadnaya', line: '1', lineColor: '#ED1B35' },
  { value: 'Troparyovo', label: '트로파료보 / Тропарёво / Troparyovo', line: '1', lineColor: '#ED1B35' },
  { value: 'Rumyantsevo', label: '루먄체보 / Румянцево / Rumyantsevo', line: '1', lineColor: '#ED1B35' },
  { value: 'Salaryevo', label: '살라례보 / Саларьево / Salaryevo', line: '1', lineColor: '#ED1B35' },
  { value: 'Filatov_Lug', label: '필라토프 루그 / Филатов Луг / Filatov Lug', line: '1', lineColor: '#ED1B35' },
  { value: 'Prokshino', label: '프록시노 / Прокшино / Prokshino', line: '1', lineColor: '#ED1B35' },
  { value: 'Olkhovaya', label: '올호바야 / Ольховая / Olkhovaya', line: '1', lineColor: '#ED1B35' },
  { value: 'Kommunarka', label: '콤무나르카 / Коммунарка / Kommunarka', line: '1', lineColor: '#ED1B35' },

  // Line 2 (Zamoskvoretskaya) - Green
  { value: 'Khovrino', label: '호브리노 / Ховрино / Khovrino', line: '2', lineColor: '#44B85C' },
  { value: 'Belomorskaya', label: '벨로모르스카야 / Беломорская / Belomorskaya', line: '2', lineColor: '#44B85C' },
  { value: 'Rechnoy_Vokzal', label: '레치노이 보크잘 / Речной Вокзал / Rechnoy Vokzal', line: '2', lineColor: '#44B85C' },
  { value: 'Vodny_Stadion', label: '보드니 스타디온 / Водный Стадион / Vodny Stadion', line: '2', lineColor: '#44B85C' },
  { value: 'Voykovskaya', label: '보이콥스카야 / Войковская / Voykovskaya', line: '2', lineColor: '#44B85C' },
  { value: 'Sokol', label: '소콜 / Сокол / Sokol', line: '2', lineColor: '#44B85C' },
  { value: 'Aeroport', label: '아에로포르트 / Аэропорт / Aeroport', line: '2', lineColor: '#44B85C' },
  { value: 'Dinamo', label: '디나모 / Динамо / Dinamo', line: '2', lineColor: '#44B85C' },
  { value: 'Begovaya', label: '베고바야 / Беговая / Begovaya', line: '2', lineColor: '#44B85C' },
  { value: 'Mayakovskaya', label: '마야콥스카야 / Маяковская / Mayakovskaya', line: '2', lineColor: '#44B85C' },
  { value: 'Tverskaya', label: '트베르스카야 / Тверская / Tverskaya', line: '2', lineColor: '#44B85C' },
  { value: 'Teatralnaya', label: '테아트랄나야 / Театральная / Teatralnaya', line: '2', lineColor: '#44B85C' },
  { value: 'Novokuznetskaya', label: '노보쿠즈네츠카야 / Новокузнецкая / Novokuznetskaya', line: '2', lineColor: '#44B85C' },
  { value: 'Paveletskaya_2', label: '파벨레츠카야 / Павелецкая / Paveletskaya', line: '2', lineColor: '#44B85C' },
  { value: 'Avtozavodskaya', label: '압토자보츠카야 / Автозаводская / Avtozavodskaya', line: '2', lineColor: '#44B85C' },
  { value: 'Kolomenskaya', label: '콜로멘스카야 / Коломенская / Kolomenskaya', line: '2', lineColor: '#44B85C' },
  { value: 'Kashirskaya', label: '카시르스카야 / Каширская / Kashirskaya', line: '2', lineColor: '#44B85C' },
  { value: 'Kantemirovskaya', label: '칸테미롭스카야 / Кантемировская / Kantemirovskaya', line: '2', lineColor: '#44B85C' },
  { value: 'Tsaritsyno', label: '차리치노 / Царицыно / Tsaritsyno', line: '2', lineColor: '#44B85C' },
  { value: 'Orekhovo', label: '오례호보 / Орехово / Orekhovo', line: '2', lineColor: '#44B85C' },
  { value: 'Domodedovskaya', label: '도모데도프스카야 / Домодедовская / Domodedovskaya', line: '2', lineColor: '#44B85C' },
  { value: 'Krasnogvardeyskaya', label: '크라스노그바르데이스카야 / Красногвардейская / Krasnogvardeyskaya', line: '2', lineColor: '#44B85C' },
  { value: 'Alma_Atinskaya', label: '알마-아틴스카야 / Алма-Атинская / Alma-Atinskaya', line: '2', lineColor: '#44B85C' },

  // Line 3 (Arbatsko-Pokrovskaya) - Blue
  { value: 'Pyatnitskoye_Shosse', label: '퍄트니츠코예 쇼세 / Пятницкое Шоссе / Pyatnitskoye Shosse', line: '3', lineColor: '#0078C9' },
  { value: 'Mitino', label: '미티노 / Митино / Mitino', line: '3', lineColor: '#0078C9' },
  { value: 'Volokolamskaya', label: '볼로콜람스카야 / Волоколамская / Volokolamskaya', line: '3', lineColor: '#0078C9' },
  { value: 'Myakinino', label: '먀키니노 / Мякинино / Myakinino', line: '3', lineColor: '#0078C9' },
  { value: 'Strogino', label: '스트로기노 / Строгино / Strogino', line: '3', lineColor: '#0078C9' },
  { value: 'Krylatskoye', label: '크릴라츠코예 / Крылатское / Krylatskoye', line: '3', lineColor: '#0078C9' },
  { value: 'Molodyozhnaya', label: '몰로죠즈나야 / Молодёжная / Molodyozhnaya', line: '3', lineColor: '#0078C9' },
  { value: 'Kuntsevskaya_3', label: '쿤체프스카야 / Кунцевская / Kuntsevskaya', line: '3', lineColor: '#0078C9' },
  { value: 'Slavyansky_Bulvar', label: '슬라뱐스키 불바르 / Славянский Бульвар / Slavyansky Bulvar', line: '3', lineColor: '#0078C9' },
  { value: 'Park_Pobedy', label: '파르크 포베디 / Парк Победы / Park Pobedy', line: '3', lineColor: '#0078C9' },
  { value: 'Kievskaya_3', label: '키예프스카야 / Киевская / Kievskaya', line: '3', lineColor: '#0078C9' },
  { value: 'Smolenskaya_3', label: '스몰렌스카야 / Смоленская / Smolenskaya', line: '3', lineColor: '#0078C9' },
  { value: 'Arbatskaya_3', label: '아르바츠카야 / Арбатская / Arbatskaya', line: '3', lineColor: '#0078C9' },
  { value: 'Ploshchad_Revolyutsii', label: '혁명 광장 / Площадь Революции / Ploshchad Revolyutsii', line: '3', lineColor: '#0078C9' },
  { value: 'Kurskaya_3', label: '쿠르스카야 / Курская / Kurskaya', line: '3', lineColor: '#0078C9' },
  { value: 'Baumanskaya', label: '바우만스카야 / Бауманская / Baumanskaya', line: '3', lineColor: '#0078C9' },
  { value: 'Elektrozavodskaya', label: '엘렉트로자보츠카야 / Электрозаводская / Elektrozavodskaya', line: '3', lineColor: '#0078C9' },
  { value: 'Semyonovskaya', label: '세먄옵스카야 / Семёновская / Semyonovskaya', line: '3', lineColor: '#0078C9' },
  { value: 'Partizanskaya', label: '파르티잔스카야 / Партизанская / Partizanskaya', line: '3', lineColor: '#0078C9' },
  { value: 'Izmailovskaya', label: '이즈마일롭스카야 / Измайловская / Izmailovskaya', line: '3', lineColor: '#0078C9' },
  { value: 'Pervomaiskaya', label: '페르보마이스카야 / Первомайская / Pervomaiskaya', line: '3', lineColor: '#0078C9' },
  { value: 'Shchelkovskaya', label: '셸콥스카야 / Щёлковская / Shchelkovskaya', line: '3', lineColor: '#0078C9' },

  // Line 4 (Filyovskaya) - Light Blue
  { value: 'Kuntsevskaya_4', label: '쿤체프스카야 / Кунцевская / Kuntsevskaya', line: '4', lineColor: '#19C1F3' },
  { value: 'Pionerskaya', label: '피오네르스카야 / Пионерская / Pionerskaya', line: '4', lineColor: '#19C1F3' },
  { value: 'Filyovsky_Park', label: '필룝스키 파르크 / Филёвский Парк / Filyovsky Park', line: '4', lineColor: '#19C1F3' },
  { value: 'Bagrationovskaya', label: '바그라티오놉스카야 / Багратионовская / Bagrationovskaya', line: '4', lineColor: '#19C1F3' },
  { value: 'Fili', label: '필리 / Фили / Fili', line: '4', lineColor: '#19C1F3' },
  { value: 'Kutuzovskaya', label: '쿠투좁스카야 / Кутузовская / Kutuzovskaya', line: '4', lineColor: '#19C1F3' },
  { value: 'Studencheskaya', label: '스투덴체스카야 / Студенческая / Studencheskaya', line: '4', lineColor: '#19C1F3' },
  { value: 'Kiyevskaya_4', label: '키예프스카야 / Киевская / Kiyevskaya', line: '4', lineColor: '#19C1F3' },
  { value: 'Smolenskaya_4', label: '스몰렌스카야 / Смоленская / Smolenskaya', line: '4', lineColor: '#19C1F3' },
  { value: 'Arbatskaya_4', label: '아르바츠카야 / Арбатская / Arbatskaya', line: '4', lineColor: '#19C1F3' },
  { value: 'Alexandrovsky_Sad', label: '알렉산드롭스키 사드 / Александровский Сад / Alexandrovsky Sad', line: '4', lineColor: '#19C1F3' },
  { value: 'Vystavochnaya', label: '비스타보치나야 / Выставочная / Vystavochnaya', line: '4', lineColor: '#19C1F3' },
  { value: 'Mezhdunarodnaya', label: '메주두나로드나야 / Международная / Mezhdunarodnaya', line: '4', lineColor: '#19C1F3' },

  // Line 5 (Koltsevaya) - Brown (환상선)
  { value: 'Kievskaya_5', label: '키예프스카야 / Киевская / Kievskaya', line: '5', lineColor: '#894E35' },
  { value: 'Park_Kultury_5', label: '파르크 쿨투리 / Парк Культуры / Park Kultury', line: '5', lineColor: '#894E35' },
  { value: 'Oktyabrskaya', label: '옥챠브리스카야 / Октябрьская / Oktyabrskaya', line: '5', lineColor: '#894E35' },
  { value: 'Dobryninskaya', label: '도브리닌스카야 / Добрынинская / Dobryninskaya', line: '5', lineColor: '#894E35' },
  { value: 'Paveletskaya_5', label: '파벨레츠카야 / Павелецкая / Paveletskaya', line: '5', lineColor: '#894E35' },
  { value: 'Taganskaya_5', label: '타간스카야 / Таганская / Taganskaya', line: '5', lineColor: '#894E35' },
  { value: 'Kurskaya_5', label: '쿠르스카야 / Курская / Kurskaya', line: '5', lineColor: '#894E35' },
  { value: 'Komsomolskaya_5', label: '콤소몰스카야 / Комсомольская / Komsomolskaya', line: '5', lineColor: '#894E35' },
  { value: 'Prospekt_Mira_5', label: '프로스펙트 미라 / Проспект Мира / Prospekt Mira', line: '5', lineColor: '#894E35' },
  { value: 'Novoslobodskaya', label: '노보슬로보츠카야 / Новослободская / Novoslobodskaya', line: '5', lineColor: '#894E35' },
  { value: 'Belorusskaya_5', label: '벨로루스카야 / Белорусская / Belorusskaya', line: '5', lineColor: '#894E35' },
  { value: 'Krasnopresnenskaya', label: '크라스노프레스넨스카야 / Краснопресненская / Krasnopresnenskaya', line: '5', lineColor: '#894E35' },

  // Line 6 (Kaluzhsko-Rizhskaya) - Orange
  { value: 'Medvedkovo', label: '메드베드코보 / Медведково / Medvedkovo', line: '6', lineColor: '#F58220' },
  { value: 'Babushkinskaya', label: '바부슈킨스카야 / Бабушкинская / Babushkinskaya', line: '6', lineColor: '#F58220' },
  { value: 'Sviblovo', label: '스비블로보 / Свиблово / Sviblovo', line: '6', lineColor: '#F58220' },
  { value: 'Botanichesky_Sad', label: '보타니체스키 사드 / Ботанический Сад / Botanichesky Sad', line: '6', lineColor: '#F58220' },
  { value: 'VDNKH', label: 'ВДНХ / ВДНХ / VDNKH', line: '6', lineColor: '#F58220' },
  { value: 'Alekseyevskaya', label: '알렉세예프스카야 / Алексеевская / Alekseyevskaya', line: '6', lineColor: '#F58220' },
  { value: 'Rizhskaya', label: '리시스카야 / Рижская / Rizhskaya', line: '6', lineColor: '#F58220' },
  { value: 'Prospekt_Mira_6', label: '프로스펙트 미라 / Проспект Мира / Prospekt Mira', line: '6', lineColor: '#F58220' },
  { value: 'Sukharevskaya', label: '수하레프스카야 / Сухаревская / Sukharevskaya', line: '6', lineColor: '#F58220' },
  { value: 'Turgenevskaya', label: '투르게네프스카야 / Тургеневская / Turgenevskaya', line: '6', lineColor: '#F58220' },
  { value: 'Kitay_Gorod_6', label: '키타이 고로드 / Китай-Город / Kitay-Gorod', line: '6', lineColor: '#F58220' },
  { value: 'Tretyakovskaya_6', label: '트레챠콥스카야 / Третьяковская / Tretyakovskaya', line: '6', lineColor: '#F58220' },
  { value: 'Oktyabrskaya_6', label: '옥챠브리스카야 / Октябрьская / Oktyabrskaya', line: '6', lineColor: '#F58220' },
  { value: 'Shabolovskaya', label: '샤볼롭스카야 / Шаболовская / Shabolovskaya', line: '6', lineColor: '#F58220' },
  { value: 'Leninskiy_Prospekt', label: '레닌스키 프로스펙트 / Ленинский Проспект / Leninskiy Prospekt', line: '6', lineColor: '#F58220' },
  { value: 'Akademicheskaya', label: '아카데미체스카야 / Академическая / Akademicheskaya', line: '6', lineColor: '#F58220' },
  { value: 'Profsoyuznaya', label: '프로프소유즈나야 / Профсоюзная / Profsoyuznaya', line: '6', lineColor: '#F58220' },
  { value: 'Novye_Cheryomushki', label: '노비예 체료무시키 / Новые Черёмушки / Novye Cheryomushki', line: '6', lineColor: '#F58220' },
  { value: 'Kaluzhskaya', label: '칼루시스카야 / Калужская / Kaluzhskaya', line: '6', lineColor: '#F58220' },
  { value: 'Belyayevo', label: '벨료예보 / Беляево / Belyayevo', line: '6', lineColor: '#F58220' },
  { value: 'Konkovo', label: '콘코보 / Коньково / Konkovo', line: '6', lineColor: '#F58220' },
  { value: 'Tyoply_Stan', label: '툐플리 스탄 / Тёплый Стан / Tyoply Stan', line: '6', lineColor: '#F58220' },
  { value: 'Yasenevo', label: '야세네보 / Ясенево / Yasenevo', line: '6', lineColor: '#F58220' },
  { value: 'Novoyasenevskaya', label: '노보야세네프스카야 / Новоясеневская / Novoyasenevskaya', line: '6', lineColor: '#F58220' },

  // Line 7 (Tagansko-Krasnopresnenskaya) - Purple
  { value: 'Planernaya', label: '플라네르나야 / Планерная / Planernaya', line: '7', lineColor: '#B51E7A' },
  { value: 'Skhodnenskaya', label: '스호드넨스카야 / Сходненская / Skhodnenskaya', line: '7', lineColor: '#B51E7A' },
  { value: 'Tushinskaya', label: '투신스카야 / Тушинская / Tushinskaya', line: '7', lineColor: '#B51E7A' },
  { value: 'Spartak', label: '스파르타크 / Спартак / Spartak', line: '7', lineColor: '#B51E7A' },
  { value: 'Shchukinskaya', label: '슈킨스카야 / Щукинская / Shchukinskaya', line: '7', lineColor: '#B51E7A' },
  { value: 'Oktyabrskoye_Pole', label: '옥챠브리스코예 폴레 / Октябрьское Поле / Oktyabrskoye Pole', line: '7', lineColor: '#B51E7A' },
  { value: 'Polezhaevskaya', label: '폴레자예프스카야 / Полежаевская / Polezhaevskaya', line: '7', lineColor: '#B51E7A' },
  { value: 'Begovaya_7', label: '베고바야 / Беговая / Begovaya', line: '7', lineColor: '#B51E7A' },
  { value: 'Ulitsa_1905_Goda', label: '울리차 1905 고다 / Улица 1905 Года / Ulitsa 1905 Goda', line: '7', lineColor: '#B51E7A' },
  { value: 'Barrikadnaya', label: '바리카드나야 / Баррикадная / Barrikadnaya', line: '7', lineColor: '#B51E7A' },
  { value: 'Pushkinskaya_7', label: '푸슈킨스카야 / Пушкинская / Pushkinskaya', line: '7', lineColor: '#B51E7A' },
  { value: 'Kuznetsky_Most', label: '쿠즈네츠키 모스트 / Кузнецкий Мост / Kuznetsky Most', line: '7', lineColor: '#B51E7A' },
  { value: 'Kitay_Gorod_7', label: '키타이 고로드 / Китай-Город / Kitay-Gorod', line: '7', lineColor: '#B51E7A' },
  { value: 'Taganskaya_7', label: '타간스카야 / Таганская / Taganskaya', line: '7', lineColor: '#B51E7A' },
  { value: 'Proletarskaya', label: '프롤레타르스카야 / Пролетарская / Proletarskaya', line: '7', lineColor: '#B51E7A' },
  { value: 'Volgogradsky_Prospekt', label: '볼고그라츠키 프로스펙트 / Волгоградский Проспект / Volgogradsky Prospekt', line: '7', lineColor: '#B51E7A' },
  { value: 'Tekstilshchiki', label: '텍스틸시키 / Текстильщики / Tekstilshchiki', line: '7', lineColor: '#B51E7A' },
  { value: 'Kuzminki', label: '쿠즈민키 / Кузьминки / Kuzminki', line: '7', lineColor: '#B51E7A' },
  { value: 'Ryazansky_Prospekt', label: '랴잔스키 프로스펙트 / Рязанский Проспект / Ryazansky Prospekt', line: '7', lineColor: '#B51E7A' },
  { value: 'Vykhino', label: '비히노 / Выхино / Vykhino', line: '7', lineColor: '#B51E7A' },
  { value: 'Lermontovsky_Prospekt', label: '레르몬톱스키 프로스펙트 / Лермонтовский Проспект / Lermontovsky Prospekt', line: '7', lineColor: '#B51E7A' },
  { value: 'Zhulebino', label: '줄례비노 / Жулебино / Zhulebino', line: '7', lineColor: '#B51E7A' },
  { value: 'Kotelniki', label: '코텔니키 / Котельники / Kotelniki', line: '7', lineColor: '#B51E7A' },

  // Line 8 (Kalininskaya) - Yellow
  { value: 'Novokosino', label: '노보코시노 / Новокосино / Novokosino', line: '8', lineColor: '#FFCB31' },
  { value: 'Novogireevo', label: '노보기례보 / Новогиреево / Novogireevo', line: '8', lineColor: '#FFCB31' },
  { value: 'Perovo', label: '페로보 / Перово / Perovo', line: '8', lineColor: '#FFCB31' },
  { value: 'Shosse_Entuziastov', label: '쇼세 엔투지아스토프 / Шоссе Энтузиастов / Shosse Entuziastov', line: '8', lineColor: '#FFCB31' },
  { value: 'Aviamotornaya', label: '아비아모토르나야 / Авиамоторная / Aviamotornaya', line: '8', lineColor: '#FFCB31' },
  { value: 'Ploshchad_Ilyicha', label: '일리차 광장 / Площадь Ильича / Ploshchad Ilyicha', line: '8', lineColor: '#FFCB31' },
  { value: 'Marksistskaya', label: '마르크시스트카야 / Марксистская / Marksistskaya', line: '8', lineColor: '#FFCB31' },
  { value: 'Tretyakovskaya_8', label: '트레챠콥스카야 / Третьяковская / Tretyakovskaya', line: '8', lineColor: '#FFCB31' },

  // Line 9 (Serpukhovsko-Timiryazevskaya) - Grey
  { value: 'Altufevo', label: '알투페보 / Алтуфьево / Altufevo', line: '9', lineColor: '#A1A2A3' },
  { value: 'Bibirevo', label: '비비례보 / Бибирево / Bibirevo', line: '9', lineColor: '#A1A2A3' },
  { value: 'Otradnoye', label: '오트라드노예 / Отрадное / Otradnoye', line: '9', lineColor: '#A1A2A3' },
  { value: 'Vladykino', label: '블라디키노 / Владыкино / Vladykino', line: '9', lineColor: '#A1A2A3' },
  { value: 'Petrovsko_Razumovskaya', label: '페트롭스코-라주몹스카야 / Петровско-Разумовская / Petrovsko-Razumovskaya', line: '9', lineColor: '#A1A2A3' },
  { value: 'Timiryazevskaya', label: '티미랴제프스카야 / Тимирязевская / Timiryazevskaya', line: '9', lineColor: '#A1A2A3' },
  { value: 'Dmitrovskaya', label: '드미트롭스카야 / Дмитровская / Dmitrovskaya', line: '9', lineColor: '#A1A2A3' },
  { value: 'Savelovskaya', label: '사벨롭스카야 / Савёловская / Savelovskaya', line: '9', lineColor: '#A1A2A3' },
  { value: 'Mendeleyevskaya', label: '멘델레예프스카야 / Менделеевская / Mendeleyevskaya', line: '9', lineColor: '#A1A2A3' },
  { value: 'Tsvetnoy_Bulvar', label: '츠베트노이 불바르 / Цветной Бульвар / Tsvetnoy Bulvar', line: '9', lineColor: '#A1A2A3' },
  { value: 'Chekhovskaya', label: '체호프스카야 / Чеховская / Chekhovskaya', line: '9', lineColor: '#A1A2A3' },
  { value: 'Borovitskaya', label: '보로비츠카야 / Боровицкая / Borovitskaya', line: '9', lineColor: '#A1A2A3' },
  { value: 'Polyanka', label: '폴란카 / Полянка / Polyanka', line: '9', lineColor: '#A1A2A3' },
  { value: 'Serpukhovskaya', label: '세르푸홉스카야 / Серпуховская / Serpukhovskaya', line: '9', lineColor: '#A1A2A3' },
  { value: 'Tulskaya', label: '툴스카야 / Тульская / Tulskaya', line: '9', lineColor: '#A1A2A3' },
  { value: 'Nagatinskaya', label: '나가틴스카야 / Нагатинская / Nagatinskaya', line: '9', lineColor: '#A1A2A3' },
  { value: 'Nagornaya', label: '나고르나야 / Нагорная / Nagornaya', line: '9', lineColor: '#A1A2A3' },
  { value: 'Nakhimovsky_Prospekt', label: '나히몹스키 프로스펙트 / Нахимовский Проспект / Nakhimovsky Prospekt', line: '9', lineColor: '#A1A2A3' },
  { value: 'Sevastopolskaya', label: '세바스토폴스카야 / Севастопольская / Sevastopolskaya', line: '9', lineColor: '#A1A2A3' },
  { value: 'Chertanovskaya', label: '체르타놉스카야 / Чертановская / Chertanovskaya', line: '9', lineColor: '#A1A2A3' },
  { value: 'Yuzhnaya', label: '유주나야 / Южная / Yuzhnaya', line: '9', lineColor: '#A1A2A3' },
  { value: 'Prazhskaya', label: '프라시스카야 / Пражская / Prazhskaya', line: '9', lineColor: '#A1A2A3' },
  { value: 'Ulitsa_Akademika_Yangelya', label: '울리차 아카데미카 얀겔랴 / Улица Академика Янгеля / Ulitsa Akademika Yangelya', line: '9', lineColor: '#A1A2A3' },
  { value: 'Annino', label: '안니노 / Аннино / Annino', line: '9', lineColor: '#A1A2A3' },
  { value: 'Bitsevsky_Park', label: '비체프스키 파르크 / Битцевский Парк / Bitsevsky Park', line: '9', lineColor: '#A1A2A3' },

  // Line 10 (Lyublinsko-Dmitrovskaya) - Light Green
  { value: 'Fonvizinskaya', label: '폰비진스카야 / Фонвизинская / Fonvizinskaya', line: '10', lineColor: '#B3D445' },
  { value: 'Butyrskaya', label: '부티르스카야 / Бутырская / Butyrskaya', line: '10', lineColor: '#B3D445' },
  { value: 'Marina_Roshcha', label: '마리나 로시차 / Марьина Роща / Marina Roshcha', line: '10', lineColor: '#B3D445' },
  { value: 'Dostoyevskaya', label: '도스토옙스카야 / Достоевская / Dostoyevskaya', line: '10', lineColor: '#B3D445' },
  { value: 'Trubnaya', label: '트루브나야 / Трубная / Trubnaya', line: '10', lineColor: '#B3D445' },
  { value: 'Sretensky_Bulvar', label: '스레텐스키 불바르 / Сретенский Бульвар / Sretensky Bulvar', line: '10', lineColor: '#B3D445' },
  { value: 'Chkalovskaya', label: '치칼롭스카야 / Чкаловская / Chkalovskaya', line: '10', lineColor: '#B3D445' },
  { value: 'Rimskaya', label: '림스카야 / Римская / Rimskaya', line: '10', lineColor: '#B3D445' },
  { value: 'Krestyanskaya_Zastava', label: '크레스챤스카야 자스타바 / Крестьянская Застава / Krestyanskaya Zastava', line: '10', lineColor: '#B3D445' },
  { value: 'Dubrovka', label: '두브롭카 / Дубровка / Dubrovka', line: '10', lineColor: '#B3D445' },
  { value: 'Kozhukhovskaya', label: '코주홉스카야 / Кожуховская / Kozhukhovskaya', line: '10', lineColor: '#B3D445' },
  { value: 'Pechatniki', label: '페차트니키 / Печатники / Pechatniki', line: '10', lineColor: '#B3D445' },
  { value: 'Volzhskaya', label: '볼시스카야 / Волжская / Volzhskaya', line: '10', lineColor: '#B3D445' },
  { value: 'Lyublino', label: '류블리노 / Люблино / Lyublino', line: '10', lineColor: '#B3D445' },
  { value: 'Bratislavskaya', label: '브라티슬라프스카야 / Братиславская / Bratislavskaya', line: '10', lineColor: '#B3D445' },
  { value: 'Maryino', label: '마리노 / Марьино / Maryino', line: '10', lineColor: '#B3D445' },
  { value: 'Borisovo', label: '보리소보 / Борисово / Borisovo', line: '10', lineColor: '#B3D445' },
  { value: 'Shipilovskaya', label: '시필롭스카야 / Шипиловская / Shipilovskaya', line: '10', lineColor: '#B3D445' },
  { value: 'Zyablikovo', label: '자블리코보 / Зябликово / Zyablikovo', line: '10', lineColor: '#B3D445' },
] as const

// Saint Petersburg Metro Line Colors
export const SPB_METRO_LINE_COLORS = {
  '1': '#DD0D2E', // Red - Kirovsko-Vyborgskaya
  '2': '#0078C8', // Blue - Moskovsko-Petrogradskaya
  '3': '#009A49', // Green - Nevsko-Vasileostrovskaya
  '4': '#F58220', // Orange - Pravoberezhnaya
  '5': '#8B4789', // Purple - Frunzensko-Primorskaya
} as const

// Saint Petersburg Metro Stations (전체 역 목록, 노선별 정렬)
export const SPB_METRO_STATIONS = [
  // Line 1 (Kirovsko-Vyborgskaya) - Red
  { value: 'Devyatkino', label: '데비야트키노 / Девяткино / Devyatkino', line: '1', lineColor: '#DD0D2E' },
  { value: 'Grazhdansky_Prospekt', label: '그라즈단스키 프로스펙트 / Гражданский Проспект / Grazhdansky Prospekt', line: '1', lineColor: '#DD0D2E' },
  { value: 'Akademicheskaya_SPB', label: '아카데미체스카야 / Академическая / Akademicheskaya', line: '1', lineColor: '#DD0D2E' },
  { value: 'Politekhnicheskaya', label: '폴리테흐니체스카야 / Политехническая / Politekhnicheskaya', line: '1', lineColor: '#DD0D2E' },
  { value: 'Ploshchad_Muzhestva', label: '용기 광장 / Площадь Мужества / Ploshchad Muzhestva', line: '1', lineColor: '#DD0D2E' },
  { value: 'Lesnaya', label: '레스나야 / Лесная / Lesnaya', line: '1', lineColor: '#DD0D2E' },
  { value: 'Vyborgskaya', label: '비보르크스카야 / Выборгская / Vyborgskaya', line: '1', lineColor: '#DD0D2E' },
  { value: 'Ploshchad_Lenina', label: '레닌 광장 / Площадь Ленина / Ploshchad Lenina', line: '1', lineColor: '#DD0D2E' },
  { value: 'Chernyshevskaya', label: '체르니셰프스카야 / Чернышевская / Chernyshevskaya', line: '1', lineColor: '#DD0D2E' },
  { value: 'Ploshchad_Vosstaniya', label: '봉기 광장 / Площадь Восстания / Ploshchad Vosstaniya', line: '1', lineColor: '#DD0D2E' },
  { value: 'Vladimirskaya_1', label: '블라디미르스카야 / Владимирская / Vladimirskaya', line: '1', lineColor: '#DD0D2E' },
  { value: 'Pushkinskaya_1', label: '푸슈킨스카야 / Пушкинская / Pushkinskaya', line: '1', lineColor: '#DD0D2E' },
  { value: 'Tekhnologichesky_Institut_1', label: '공대 / Технологический Институт / Tekhnologichesky Institut', line: '1', lineColor: '#DD0D2E' },
  { value: 'Baltiyskaya', label: '발티스카야 / Балтийская / Baltiyskaya', line: '1', lineColor: '#DD0D2E' },
  { value: 'Narvskaya', label: '나르프스카야 / Нарвская / Narvskaya', line: '1', lineColor: '#DD0D2E' },
  { value: 'Kirovsky_Zavod', label: '키롭스키 자보드 / Кировский Завод / Kirovsky Zavod', line: '1', lineColor: '#DD0D2E' },
  { value: 'Avtovo', label: '압토보 / Автово / Avtovo', line: '1', lineColor: '#DD0D2E' },
  { value: 'Leninskiy_Prospekt_SPB', label: '레닌스키 프로스펙트 / Ленинский Проспект / Leninskiy Prospekt', line: '1', lineColor: '#DD0D2E' },
  { value: 'Prospekt_Veteranov', label: '프로스펙트 베테라놉 / Проспект Ветеранов / Prospekt Veteranov', line: '1', lineColor: '#DD0D2E' },

  // Line 2 (Moskovsko-Petrogradskaya) - Blue
  { value: 'Parnas', label: '파르나스 / Парнас / Parnas', line: '2', lineColor: '#0078C8' },
  { value: 'Prospekt_Prosvescheniya', label: '프로스펙트 프로스베시체냐 / Проспект Просвещения / Prospekt Prosvescheniya', line: '2', lineColor: '#0078C8' },
  { value: 'Ozerki', label: '오제르키 / Озерки / Ozerki', line: '2', lineColor: '#0078C8' },
  { value: 'Udelnaya', label: '우델나야 / Удельная / Udelnaya', line: '2', lineColor: '#0078C8' },
  { value: 'Pionerskaya_SPB', label: '피오네르스카야 / Пионерская / Pionerskaya', line: '2', lineColor: '#0078C8' },
  { value: 'Chyornaya_Rechka', label: '초르나야 레치카 / Чёрная Речка / Chyornaya Rechka', line: '2', lineColor: '#0078C8' },
  { value: 'Petrogradskaya', label: '페트로그라츠카야 / Петроградская / Petrogradskaya', line: '2', lineColor: '#0078C8' },
  { value: 'Gorkovskaya', label: '고르콥스카야 / Горьковская / Gorkovskaya', line: '2', lineColor: '#0078C8' },
  { value: 'Nevsky_Prospekt', label: '넵스키 대로 / Невский Проспект / Nevsky Prospekt', line: '2', lineColor: '#0078C8' },
  { value: 'Sennaya_Ploshchad_2', label: '센나야 광장 / Сенная Площадь / Sennaya Ploshchad', line: '2', lineColor: '#0078C8' },
  { value: 'Tekhnologichesky_Institut_2', label: '공대 / Технологический Институт / Tekhnologichesky Institut', line: '2', lineColor: '#0078C8' },
  { value: 'Frunzenskaya_SPB', label: '프룬젠스카야 / Фрунзенская / Frunzenskaya', line: '2', lineColor: '#0078C8' },
  { value: 'Moskovskiye_Vorota', label: '모스콥스키예 보로타 / Московские Ворота / Moskovskiye Vorota', line: '2', lineColor: '#0078C8' },
  { value: 'Elektrosila', label: '엘렉트로실라 / Электросила / Elektrosila', line: '2', lineColor: '#0078C8' },
  { value: 'Park_Pobedy_SPB', label: '파르크 포베디 / Парк Победы / Park Pobedy', line: '2', lineColor: '#0078C8' },
  { value: 'Moskovskaya_SPB', label: '모스콥스카야 / Московская / Moskovskaya', line: '2', lineColor: '#0078C8' },
  { value: 'Zvezdnaya', label: '즈베즈드나야 / Звёздная / Zvezdnaya', line: '2', lineColor: '#0078C8' },
  { value: 'Kupchino', label: '쿠프치노 / Купчино / Kupchino', line: '2', lineColor: '#0078C8' },

  // Line 3 (Nevsko-Vasileostrovskaya) - Green
  { value: 'Begovaya_SPB', label: '베고바야 / Беговая / Begovaya', line: '3', lineColor: '#009A49' },
  { value: 'Zenit', label: '제니트 / Зенит / Zenit', line: '3', lineColor: '#009A49' },
  { value: 'Primorskaya', label: '프리모르스카야 / Приморская / Primorskaya', line: '3', lineColor: '#009A49' },
  { value: 'Vasileostrovskaya', label: '바실레오스트롭스카야 / Василеостровская / Vasileostrovskaya', line: '3', lineColor: '#009A49' },
  { value: 'Gostiny_Dvor', label: '고스티니 드보르 / Гостиный Двор / Gostiny Dvor', line: '3', lineColor: '#009A49' },
  { value: 'Mayakovskaya_3', label: '마야콥스카야 / Маяковская / Mayakovskaya', line: '3', lineColor: '#009A49' },
  { value: 'Ploshchad_Alexandra_Nevskogo_3', label: '넵스키 광장 / Площадь Александра Невского / Ploshchad Alexandra Nevskogo', line: '3', lineColor: '#009A49' },
  { value: 'Yelizarovskaya', label: '옐리자롭스카야 / Елизаровская / Yelizarovskaya', line: '3', lineColor: '#009A49' },
  { value: 'Lomonosovskaya', label: '로모노솝스카야 / Ломоносовская / Lomonosovskaya', line: '3', lineColor: '#009A49' },
  { value: 'Proletarskaya_SPB', label: '프롤레타르스카야 / Пролетарская / Proletarskaya', line: '3', lineColor: '#009A49' },
  { value: 'Obukhovo', label: '오부호보 / Обухово / Obukhovo', line: '3', lineColor: '#009A49' },
  { value: 'Rybatskoye', label: '리바츠코예 / Рыбацкое / Rybatskoye', line: '3', lineColor: '#009A49' },

  // Line 4 (Pravoberezhnaya) - Orange
  { value: 'Spasskaya', label: '스파스카야 / Спасская / Spasskaya', line: '4', lineColor: '#F58220' },
  { value: 'Dostoevskaya_SPB', label: '도스토옙스카야 / Достоевская / Dostoevskaya', line: '4', lineColor: '#F58220' },
  { value: 'Ligovskiy_Prospekt', label: '리곱스키 대로 / Лиговский Проспект / Ligovskiy Prospekt', line: '4', lineColor: '#F58220' },
  { value: 'Ploshchad_Alexandra_Nevskogo_4', label: '넵스키 광장 / Площадь Александра Невского / Ploshchad Alexandra Nevskogo', line: '4', lineColor: '#F58220' },
  { value: 'Novocherkasskaya_4', label: '노보체르카스카야 / Новочеркасская / Novocherkasskaya', line: '4', lineColor: '#F58220' },
  { value: 'Ladozhskaya', label: '라도시스카야 / Ладожская / Ladozhskaya', line: '4', lineColor: '#F58220' },
  { value: 'Prospekt_Bolshevikov', label: '프로스펙트 볼셰비코프 / Проспект Большевиков / Prospekt Bolshevikov', line: '4', lineColor: '#F58220' },
  { value: 'Ulitsa_Dybenko', label: '울리차 디벤코 / Улица Дыбенко / Ulitsa Dybenko', line: '4', lineColor: '#F58220' },

  // Line 5 (Frunzensko-Primorskaya) - Purple
  { value: 'Komendantsky_Prospekt', label: '코멘단츠키 대로 / Комендантский Проспект / Komendantsky Prospekt', line: '5', lineColor: '#8B4789' },
  { value: 'Staraya_Derevnya', label: '스타라야 데례브냐 / Старая Деревня / Staraya Derevnya', line: '5', lineColor: '#8B4789' },
  { value: 'Krestovsky_Ostrov', label: '크레스톱스키 오스트롭 / Крестовский Остров / Krestovsky Ostrov', line: '5', lineColor: '#8B4789' },
  { value: 'Chkalovskaya_SPB', label: '치칼롭스카야 / Чкаловская / Chkalovskaya', line: '5', lineColor: '#8B4789' },
  { value: 'Sportivnaya_5', label: '스포르티브나야 / Спортивная / Sportivnaya', line: '5', lineColor: '#8B4789' },
  { value: 'Admiralteyskaya', label: '아드미랄테이스카야 / Адмиралтейская / Admiralteyskaya', line: '5', lineColor: '#8B4789' },
  { value: 'Sadovaya_5', label: '사도바야 / Садовая / Sadovaya', line: '5', lineColor: '#8B4789' },
  { value: 'Zvenigorodskaya_5', label: '즈베니고로츠카야 / Звенигородская / Zvenigorodskaya', line: '5', lineColor: '#8B4789' },
  { value: 'Obvodny_Kanal', label: '옵보드니 카날 / Обводный Канал / Obvodny Kanal', line: '5', lineColor: '#8B4789' },
  { value: 'Volkovskaya', label: '볼콥스카야 / Волковская / Volkovskaya', line: '5', lineColor: '#8B4789' },
  { value: 'Bukharestskaya', label: '부하레스츠카야 / Бухарестская / Bukharestskaya', line: '5', lineColor: '#8B4789' },
  { value: 'Mezhdunarodnaya_SPB', label: '메주두나로드나야 / Международная / Mezhdunarodnaya', line: '5', lineColor: '#8B4789' },
  { value: 'Prospekt_Slavy', label: '프로스펙트 슬라비 / Проспект Славы / Prospekt Slavy', line: '5', lineColor: '#8B4789' },
  { value: 'Dunayskaya', label: '두나이스카야 / Дунайская / Dunayskaya', line: '5', lineColor: '#8B4789' },
  { value: 'Shushary', label: '슈샤리 / Шушары / Shushary', line: '5', lineColor: '#8B4789' },
] as const
