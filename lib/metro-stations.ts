// 모스크바 및 상트페테르부르크 지하철역 목록
// 주요 역 및 한인 거주 밀집 지역 중심으로 선정

export interface MetroStation {
  value: string // 영문 (DB 저장용)
  labelKo: string // 한글 표기
  labelRu: string // 러시아어 표기
  line: string // 노선명
}

export interface MetroLineColor {
  color: string // HEX 색상 코드
  name: string // 노선 이름
}

// 모스크바 지하철 노선 색상
export const MOSCOW_LINE_COLORS: Record<string, MetroLineColor> = {
  'Line 1': { color: '#ED1B35', name: 'Sokolnicheskaya' },
  'Line 2': { color: '#44B85C', name: 'Zamoskvoretskaya' },
  'Line 3': { color: '#0078C9', name: 'Arbatsko-Pokrovskaya' },
  'Line 4': { color: '#19C1F3', name: 'Filyovskaya' },
  'Line 5': { color: '#894E35', name: 'Koltsevaya' },
  'Line 6': { color: '#F58220', name: 'Kaluzhsko-Rizhskaya' },
  'Line 7': { color: '#8E479C', name: 'Tagansko-Krasnopresnenskaya' },
  'Line 8': { color: '#FFCB31', name: 'Kalininskaya' },
  'Line 9': { color: '#A1A2A3', name: 'Serpukhovsko-Timiryazevskaya' },
  'Line 10': { color: '#B3D445', name: 'Lyublinsko-Dmitrovskaya' },
}

// 상트페테르부르크 지하철 노선 색상
export const SPB_LINE_COLORS: Record<string, MetroLineColor> = {
  'Line 1': { color: '#D6083B', name: 'Kirovsko-Vyborgskaya' },
  'Line 2': { color: '#0078C9', name: 'Moskovsko-Petrogradskaya' },
  'Line 3': { color: '#009A49', name: 'Nevsko-Vasileostrovskaya' },
  'Line 4': { color: '#F58220', name: 'Pravoberezhnaya' },
  'Line 5': { color: '#8E479C', name: 'Frunzensko-Primorskaya' },
}

// 모스크바 지하철역 (Moscow Metro)
export const MOSCOW_METRO_STATIONS: MetroStation[] = [
  // Line 1 - Sokolnicheskaya Line (빨간선)
  { value: 'Sokolniki', labelKo: '소콜니키', labelRu: 'Сокольники', line: 'Line 1' },
  { value: 'Krasnye_Vorota', labelKo: '크라스니예 보로타', labelRu: 'Красные Ворота', line: 'Line 1' },
  { value: 'Chistye_Prudy', labelKo: '치스티예 프루디', labelRu: 'Чистые пруды', line: 'Line 1' },
  { value: 'Lubyanka', labelKo: '루뱐카', labelRu: 'Лубянка', line: 'Line 1' },
  { value: 'Okhotny_Ryad', labelKo: '오호트니 랴드', labelRu: 'Охотный ряд', line: 'Line 1' },
  { value: 'Biblioteka_Lenina', labelKo: '비블리오테카 레니나', labelRu: 'Библиотека имени Ленина', line: 'Line 1' },
  { value: 'Kropotkinskaya', labelKo: '크로포트킨스카야', labelRu: 'Кропоткинская', line: 'Line 1' },
  { value: 'Park_Kultury', labelKo: '파르크 쿨투리', labelRu: 'Парк культуры', line: 'Line 1' },
  { value: 'Frunzenskaya', labelKo: '프룬젠스카야', labelRu: 'Фрунзенская', line: 'Line 1' },
  { value: 'Sportivnaya', labelKo: '스포르티브나야', labelRu: 'Спортивная', line: 'Line 1' },
  { value: 'Vorobyovy_Gory', labelKo: '보로뵤비 고리', labelRu: 'Воробьёвы горы', line: 'Line 1' },
  { value: 'Universitet', labelKo: '우니베르시테트', labelRu: 'Университет', line: 'Line 1' },

  // Line 2 - Zamoskvoretskaya Line (초록선)
  { value: 'Rechnoy_Vokzal', labelKo: '레치노이 복잘', labelRu: 'Речной вокзал', line: 'Line 2' },
  { value: 'Belorusskaya', labelKo: '벨로루스카야', labelRu: 'Белорусская', line: 'Line 2' },
  { value: 'Mayakovskaya', labelKo: '마야코프스카야', labelRu: 'Маяковская', line: 'Line 2' },
  { value: 'Tverskaya', labelKo: '트베르스카야', labelRu: 'Тверская', line: 'Line 2' },
  { value: 'Teatralnaya', labelKo: '테아트랄나야', labelRu: 'Театральная', line: 'Line 2' },
  { value: 'Novokuznetskaya', labelKo: '노보쿠즈네츠카야', labelRu: 'Новокузнецкая', line: 'Line 2' },
  { value: 'Paveletskaya', labelKo: '파벨레츠카야', labelRu: 'Павелецкая', line: 'Line 2' },
  { value: 'Avtozavodskaya', labelKo: '압토자보츠카야', labelRu: 'Автозаводская', line: 'Line 2' },

  // Line 3 - Arbatsko-Pokrovskaya Line (파란선)
  { value: 'Arbatskaya', labelKo: '아르바츠카야', labelRu: 'Арбатская', line: 'Line 3' },
  { value: 'Ploshchad_Revolyutsii', labelKo: '플로샤디 레볼류치', labelRu: 'Площадь Революции', line: 'Line 3' },
  { value: 'Kurskaya', labelKo: '쿠르스카야', labelRu: 'Курская', line: 'Line 3' },
  { value: 'Baumanskaya', labelKo: '바우만스카야', labelRu: 'Бауманская', line: 'Line 3' },
  { value: 'Izmaylovskaya', labelKo: '이즈마일롭스카야', labelRu: 'Измайловская', line: 'Line 3' },
  { value: 'Pervomayskaya', labelKo: '페르보마이스카야', labelRu: 'Первомайская', line: 'Line 3' },
  { value: 'Smolenskaya', labelKo: '스몰렌스카야', labelRu: 'Смоленская', line: 'Line 3' },
  { value: 'Kievskaya', labelKo: '키예프스카야', labelRu: 'Киевская', line: 'Line 3' },
  { value: 'Kuntsevskaya', labelKo: '쿤체프스카야', labelRu: 'Кунцевская', line: 'Line 3' },

  // Line 4 - Filyovskaya Line (하늘색선)
  { value: 'Aleksandrovsky_Sad', labelKo: '알렉산드롭스키 사드', labelRu: 'Александровский сад', line: 'Line 4' },
  { value: 'Arbatskaya_Filyovskaya', labelKo: '아르바츠카야', labelRu: 'Арбатская', line: 'Line 4' },
  { value: 'Kievskaya_Filyovskaya', labelKo: '키예프스카야', labelRu: 'Киевская', line: 'Line 4' },
  { value: 'Fili', labelKo: '필리', labelRu: 'Фили', line: 'Line 4' },

  // Line 5 - Koltsevaya Line (갈색 순환선)
  { value: 'Komsomolskaya', labelKo: '콤소몰스카야', labelRu: 'Комсомольская', line: 'Line 5' },
  { value: 'Prospekt_Mira', labelKo: '프로스펙트 미라', labelRu: 'Проспект Мира', line: 'Line 5' },
  { value: 'Novoslobodskaya', labelKo: '노보슬로보츠카야', labelRu: 'Новослободская', line: 'Line 5' },
  { value: 'Belorusskaya_Ring', labelKo: '벨로루스카야', labelRu: 'Белорусская', line: 'Line 5' },
  { value: 'Krasnopresnenskaya', labelKo: '크라스노프레스넨스카야', labelRu: 'Краснопресненская', line: 'Line 5' },
  { value: 'Kievskaya_Ring', labelKo: '키예프스카야', labelRu: 'Киевская', line: 'Line 5' },
  { value: 'Park_Kultury_Ring', labelKo: '파르크 쿨투리', labelRu: 'Парк культуры', line: 'Line 5' },
  { value: 'Oktyabrskaya', labelKo: '옥챠브르스카야', labelRu: 'Октябрьская', line: 'Line 5' },
  { value: 'Dobryninskaya', labelKo: '도브리닌스카야', labelRu: 'Добрынинская', line: 'Line 5' },
  { value: 'Paveletskaya_Ring', labelKo: '파벨레츠카야', labelRu: 'Павелецкая', line: 'Line 5' },
  { value: 'Taganskaya', labelKo: '타간스카야', labelRu: 'Таганская', line: 'Line 5' },
  { value: 'Kurskaya_Ring', labelKo: '쿠르스카야', labelRu: 'Курская', line: 'Line 5' },

  // Line 6 - Kaluzhsko-Rizhskaya Line (주황선)
  { value: 'Medvedkovo', labelKo: '메드베드코보', labelRu: 'Медведково', line: 'Line 6' },
  { value: 'VDNKh', labelKo: 'VDNH', labelRu: 'ВДНХ', line: 'Line 6' },
  { value: 'Alekseevskaya', labelKo: '알렉세예프스카야', labelRu: 'Алексеевская', line: 'Line 6' },
  { value: 'Rizhskaya', labelKo: '리시스카야', labelRu: 'Рижская', line: 'Line 6' },
  { value: 'Prospekt_Mira_Orange', labelKo: '프로스펙트 미라', labelRu: 'Проспект Мира', line: 'Line 6' },
  { value: 'Kitay_Gorod', labelKo: '키타이 고로드', labelRu: 'Китай-город', line: 'Line 6' },
  { value: 'Tretyakovskaya', labelKo: '트레챠코프스카야', labelRu: 'Третьяковская', line: 'Line 6' },
  { value: 'Oktyabrskaya_Orange', labelKo: '옥챠브르스카야', labelRu: 'Октябрьская', line: 'Line 6' },
  { value: 'Shabolovskaya', labelKo: '샤볼롭스카야', labelRu: 'Шаболовская', line: 'Line 6' },
  { value: 'Belyaevo', labelKo: '벨랴예보', labelRu: 'Беляево', line: 'Line 6' },
  { value: 'Konkovo', labelKo: '콘코보', labelRu: 'Коньково', line: 'Line 6' },
  { value: 'Teply_Stan', labelKo: '테플리 스탄', labelRu: 'Тёплый Стан', line: 'Line 6' },
  { value: 'Yasenevo', labelKo: '야세네보', labelRu: 'Ясенево', line: 'Line 6' },

  // Line 7 - Tagansko-Krasnopresnenskaya Line (보라선)
  { value: 'Planernaya', labelKo: '플라네르나야', labelRu: 'Планерная', line: 'Line 7' },
  { value: 'Pushkinskaya', labelKo: '푸시킨스카야', labelRu: 'Пушкинская', line: 'Line 7' },
  { value: 'Kuznetsky_Most', labelKo: '쿠즈네츠키 모스트', labelRu: 'Кузнецкий мост', line: 'Line 7' },
  { value: 'Kitay_Gorod_Purple', labelKo: '키타이 고로드', labelRu: 'Китай-город', line: 'Line 7' },
  { value: 'Taganskaya_Purple', labelKo: '타간스카야', labelRu: 'Таганская', line: 'Line 7' },
  { value: 'Proletarskaya', labelKo: '프롤레타르스카야', labelRu: 'Пролетарская', line: 'Line 7' },
  { value: 'Tekstilshchiki', labelKo: '텍스틸시키', labelRu: 'Текстильщики', line: 'Line 7' },

  // Line 8 - Kalininskaya Line (노란선)
  { value: 'Novokosino', labelKo: '노보코시노', labelRu: 'Новокосино', line: 'Line 8' },
  { value: 'Shosse_Entuziastov', labelKo: '쇼세 엔투지아스토프', labelRu: 'Шоссе Энтузиастов', line: 'Line 8' },
  { value: 'Aviamotornaya', labelKo: '아비아모토르나야', labelRu: 'Авиамоторная', line: 'Line 8' },
  { value: 'Tretyakovskaya_Yellow', labelKo: '트레챠코프스카야', labelRu: 'Третьяковская', line: 'Line 8' },

  // Line 9 - Serpukhovsko-Timiryazevskaya Line (회색선)
  { value: 'Altufevo', labelKo: '알투피예보', labelRu: 'Алтуфьево', line: 'Line 9' },
  { value: 'Bibirevo', labelKo: '비비레보', labelRu: 'Бибирево', line: 'Line 9' },
  { value: 'Dmitrovskaya', labelKo: '드미트롭스카야', labelRu: 'Дмитровская', line: 'Line 9' },
  { value: 'Timiryazevskaya', labelKo: '티미랴젭스카야', labelRu: 'Тимирязевская', line: 'Line 9' },
  { value: 'Savyolovskaya', labelKo: '사뵐롭스카야', labelRu: 'Савёловская', line: 'Line 9' },
  { value: 'Mendeleyevskaya', labelKo: '멘델레예프스카야', labelRu: 'Менделеевская', line: 'Line 9' },
  { value: 'Chekhovskaya', labelKo: '체호프스카야', labelRu: 'Чеховская', line: 'Line 9' },
  { value: 'Borovitskaya', labelKo: '보로비츠카야', labelRu: 'Боровицкая', line: 'Line 9' },
  { value: 'Polyanka', labelKo: '폴랸카', labelRu: 'Полянка', line: 'Line 9' },
  { value: 'Serpukhovskaya', labelKo: '세르푸홉스카야', labelRu: 'Серпуховская', line: 'Line 9' },
  { value: 'Tulskaya', labelKo: '툴스카야', labelRu: 'Тульская', line: 'Line 9' },
  { value: 'Nagatinskaya', labelKo: '나가틴스카야', labelRu: 'Нагатинская', line: 'Line 9' },

  // Line 10 - Lyublinsko-Dmitrovskaya Line (연두색선)
  { value: 'Maryina_Roshcha', labelKo: '마리나 로샤', labelRu: 'Марьина Роща', line: 'Line 10' },
  { value: 'Dostoyevskaya', labelKo: '도스토옙스카야', labelRu: 'Достоевская', line: 'Line 10' },
  { value: 'Trubnaya', labelKo: '트루브나야', labelRu: 'Трубная', line: 'Line 10' },
  { value: 'Sretensky_Bulvar', labelKo: '스레텐스키 불바르', labelRu: 'Сретенский бульвар', line: 'Line 10' },
  { value: 'Chkalovskaya', labelKo: '치칼롭스카야', labelRu: 'Чкаловская', line: 'Line 10' },
  { value: 'Rimskaya', labelKo: '림스카야', labelRu: 'Римская', line: 'Line 10' },
  { value: 'Krestyanskaya_Zastava', labelKo: '크레스챤스카야 자스타바', labelRu: 'Крестьянская застава', line: 'Line 10' },
  { value: 'Dubrovka', labelKo: '두브롭카', labelRu: 'Дубровка', line: 'Line 10' },
  { value: 'Maryino', labelKo: '마리노', labelRu: 'Марьино', line: 'Line 10' },
  { value: 'Bratislavskaya', labelKo: '브라티슬라프스카야', labelRu: 'Братиславская', line: 'Line 10' },
]

// 상트페테르부르크 지하철역 (Saint Petersburg Metro)
export const SPB_METRO_STATIONS: MetroStation[] = [
  // Line 1 - Kirovsko-Vyborgskaya Line (빨간선)
  { value: 'Devyatkino', labelKo: '데뱌트키노', labelRu: 'Девяткино', line: 'Line 1' },
  { value: 'Grazhdansky_Prospekt', labelKo: '그라즈단스키 프로스펙트', labelRu: 'Гражданский проспект', line: 'Line 1' },
  { value: 'Akademicheskaya', labelKo: '아카데미체스카야', labelRu: 'Академическая', line: 'Line 1' },
  { value: 'Politekhnicheskaya', labelKo: '폴리테흐니체스카야', labelRu: 'Политехническая', line: 'Line 1' },
  { value: 'Ploshchad_Muzhestva', labelKo: '플로샤디 무제스트바', labelRu: 'Площадь Мужества', line: 'Line 1' },
  { value: 'Lesnaya', labelKo: '레스나야', labelRu: 'Лесная', line: 'Line 1' },
  { value: 'Vyborgskaya', labelKo: '비보르크스카야', labelRu: 'Выборгская', line: 'Line 1' },
  { value: 'Ploshchad_Lenina', labelKo: '플로샤디 레니나', labelRu: 'Площадь Ленина', line: 'Line 1' },
  { value: 'Chernyshevskaya', labelKo: '체르니셰프스카야', labelRu: 'Чернышевская', line: 'Line 1' },
  { value: 'Ploshchad_Vosstaniya', labelKo: '플로샤디 보스타니야', labelRu: 'Площадь Восстания', line: 'Line 1' },
  { value: 'Vladimirskaya', labelKo: '블라디미르스카야', labelRu: 'Владимирская', line: 'Line 1' },
  { value: 'Pushkinskaya_SPB', labelKo: '푸시킨스카야', labelRu: 'Пушкинская', line: 'Line 1' },
  { value: 'Tekhnologichesky_Institut_1', labelKo: '테흐놀로기체스키 인스티투트', labelRu: 'Технологический институт', line: 'Line 1' },
  { value: 'Baltiyskaya', labelKo: '발티스카야', labelRu: 'Балтийская', line: 'Line 1' },
  { value: 'Narvskaya', labelKo: '나르프스카야', labelRu: 'Нарвская', line: 'Line 1' },
  { value: 'Kirovsky_Zavod', labelKo: '키롭스키 자보드', labelRu: 'Кировский завод', line: 'Line 1' },
  { value: 'Avtovo', labelKo: '압토보', labelRu: 'Автово', line: 'Line 1' },
  { value: 'Leninskypekt', labelKo: '레닌스키 프로스펙트', labelRu: 'Ленинский проспект', line: 'Line 1' },
  { value: 'Prospekt_Veteranov', labelKo: '프로스펙트 베테라노프', labelRu: 'Проспект Ветеранов', line: 'Line 1' },

  // Line 2 - Moskovsko-Petrogradskaya Line (파란선)
  { value: 'Parnas', labelKo: '파르나스', labelRu: 'Парнас', line: 'Line 2' },
  { value: 'Prospekt_Prosveshcheniya', labelKo: '프로스펙트 프로스베셴야', labelRu: 'Проспект Просвещения', line: 'Line 2' },
  { value: 'Ozerki', labelKo: '오제르키', labelRu: 'Озерки', line: 'Line 2' },
  { value: 'Udelnaya', labelKo: '우델나야', labelRu: 'Удельная', line: 'Line 2' },
  { value: 'Pionerskaya', labelKo: '피오네르스카야', labelRu: 'Пионерская', line: 'Line 2' },
  { value: 'Chyornaya_Rechka', labelKo: '초르나야 레치카', labelRu: 'Чёрная речка', line: 'Line 2' },
  { value: 'Petrogradskaya', labelKo: '페트로그라츠카야', labelRu: 'Петроградская', line: 'Line 2' },
  { value: 'Gorkovskaya', labelKo: '고르콥스카야', labelRu: 'Горьковская', line: 'Line 2' },
  { value: 'Nevsky_Prospekt', labelKo: '넵스키 프로스펙트', labelRu: 'Невский проспект', line: 'Line 2' },
  { value: 'Sennaya_Ploshchad', labelKo: '센나야 플로샤디', labelRu: 'Сенная площадь', line: 'Line 2' },
  { value: 'Tekhnologichesky_Institut_2', labelKo: '테흐놀로기체스키 인스티투트', labelRu: 'Технологический институт', line: 'Line 2' },
  { value: 'Frunzenskaya_SPB', labelKo: '프룬젠스카야', labelRu: 'Фрунзенская', line: 'Line 2' },
  { value: 'Moskovskie_Vorota', labelKo: '모스콥스키예 보로타', labelRu: 'Московские ворота', line: 'Line 2' },
  { value: 'Elektrosila', labelKo: '엘렉트로실라', labelRu: 'Электросила', line: 'Line 2' },
  { value: 'Park_Pobedy', labelKo: '파르크 포베디', labelRu: 'Парк Победы', line: 'Line 2' },
  { value: 'Moskovskaya', labelKo: '모스콥스카야', labelRu: 'Московская', line: 'Line 2' },
  { value: 'Zvyozdnaya', labelKo: '즈뵈즈드나야', labelRu: 'Звёздная', line: 'Line 2' },
  { value: 'Kupchino', labelKo: '쿠프치노', labelRu: 'Купчино', line: 'Line 2' },

  // Line 3 - Nevsko-Vasileostrovskaya Line (초록선)
  { value: 'Begovaya', labelKo: '베고바야', labelRu: 'Беговая', line: 'Line 3' },
  { value: 'Novokrestovskaya', labelKo: '노보크레스톱스카야', labelRu: 'Новокрестовская', line: 'Line 3' },
  { value: 'Primorskaya', labelKo: '프리모르스카야', labelRu: 'Приморская', line: 'Line 3' },
  { value: 'Vasileostrovskaya', labelKo: '바실레오스트롭스카야', labelRu: 'Василеостровская', line: 'Line 3' },
  { value: 'Gostiny_Dvor', labelKo: '고스티니 드보르', labelRu: 'Гостиный двор', line: 'Line 3' },
  { value: 'Mayakovskaya_SPB', labelKo: '마야코프스카야', labelRu: 'Маяковская', line: 'Line 3' },
  { value: 'Ploshchad_Alexandra_Nevskogo_1', labelKo: '플로샤디 알렉산드라 넵스코고', labelRu: 'Площадь Александра Невского', line: 'Line 3' },
  { value: 'Elizarovskaya', labelKo: '엘리자롭스카야', labelRu: 'Елизаровская', line: 'Line 3' },
  { value: 'Lomonosovskaya', labelKo: '로모노솝스카야', labelRu: 'Ломоносовская', line: 'Line 3' },
  { value: 'Proletarskaya_SPB', labelKo: '프롤레타르스카야', labelRu: 'Пролетарская', line: 'Line 3' },
  { value: 'Obukhovo', labelKo: '오부호보', labelRu: 'Обухово', line: 'Line 3' },
  { value: 'Rybatskoye', labelKo: '리바츠코예', labelRu: 'Рыбацкое', line: 'Line 3' },

  // Line 4 - Pravoberezhnaya Line (주황선)
  { value: 'Спасская', labelKo: '스파스카야', labelRu: 'Спасская', line: 'Line 4' },
  { value: 'Dostoevskaya_SPB', labelKo: '도스토옙스카야', labelRu: 'Достоевская', line: 'Line 4' },
  { value: 'Ligovskypekt', labelKo: '리곱스키 프로스펙트', labelRu: 'Лиговский проспект', line: 'Line 4' },
  { value: 'Ploshchad_Alexandra_Nevskogo_2', labelKo: '플로샤디 알렉산드라 넵스코고', labelRu: 'Площадь Александра Невского', line: 'Line 4' },
  { value: 'Novocherkasskaya', labelKo: '노보체르카스카야', labelRu: 'Новочеркасская', line: 'Line 4' },
  { value: 'Ladozhskaya', labelKo: '라도시스카야', labelRu: 'Ладожская', line: 'Line 4' },
  { value: 'Prospekt_Bolshevikov', labelKo: '프로스펙트 볼셰비코프', labelRu: 'Проспект Большевиков', line: 'Line 4' },
  { value: 'Ulitsa_Dybenko', labelKo: '울리차 디벤코', labelRu: 'Улица Дыбенко', line: 'Line 4' },

  // Line 5 - Frunzensko-Primorskaya Line (보라선)
  { value: 'Komendantsky_Prospekt', labelKo: '코멘단츠키 프로스펙트', labelRu: 'Комендантский проспект', line: 'Line 5' },
  { value: 'Staraya_Derevnya', labelKo: '스타라야 데레브냐', labelRu: 'Старая Деревня', line: 'Line 5' },
  { value: 'Krestovsky_Ostrov', labelKo: '크레스톱스키 오스트로프', labelRu: 'Крестовский остров', line: 'Line 5' },
  { value: 'Chkalovskaya_SPB', labelKo: '치칼롭스카야', labelRu: 'Чкаловская', line: 'Line 5' },
  { value: 'Sportivnaya_SPB', labelKo: '스포르티브나야', labelRu: 'Спортивная', line: 'Line 5' },
  { value: 'Admiralteyskaya', labelKo: '아드미랄테이스카야', labelRu: 'Адмиралтейская', line: 'Line 5' },
  { value: 'Sadovaya', labelKo: '사도바야', labelRu: 'Садовая', line: 'Line 5' },
  { value: 'Zvenigorodskaya', labelKo: '즈베니고롯스카야', labelRu: 'Звенигородская', line: 'Line 5' },
  { value: 'Obvodny_Kanal', labelKo: '옵보드니 카날', labelRu: 'Обводный канал', line: 'Line 5' },
  { value: 'Volkovskaya', labelKo: '볼콥스카야', labelRu: 'Волковская', line: 'Line 5' },
  { value: 'Bukharestskaya', labelKo: '부하레스츠카야', labelRu: 'Бухарестская', line: 'Line 5' },
  { value: 'Mezhdunarodnaya', labelKo: '메즈두나로드나야', labelRu: 'Международная', line: 'Line 5' },
]

// 모든 지하철역 통합
export const ALL_METRO_STATIONS = [...MOSCOW_METRO_STATIONS, ...SPB_METRO_STATIONS]

// 영문 value로 한글 label 찾기
export function getMetroStationLabel(value: string): string {
  const station = ALL_METRO_STATIONS.find(s => s.value === value)
  return station?.labelKo || value
}

// 여러 지하철역의 한글 label 찾기
export function getMetroStationLabels(values: string[]): string[] {
  return values.map(value => getMetroStationLabel(value))
}
