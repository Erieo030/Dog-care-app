/**
 * 用途：MEGO 自行維護的動物醫院地點資料。
 * 上線資料需逐筆核對政府名冊、地址與座標；沒有核實的醫院不應先放進地圖。
 */
export interface VetHospital {
  id: string;
  name: string;
  county: string;
  district?: string;
  address: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  sourceName: string;
  sourceUrl: string;
  coordinateSourceName: string;
  coordinateSourceUrl: string;
  sourceUpdatedAt: string;
  verifiedAt: string;
  isEmergency?: boolean;
  isOpen24Hours?: boolean;
  emergencyServiceText?: string;
}

const TAICHUNG_EMERGENCY_SOURCE = 'https://data.gov.tw/dataset/83763';
const OSM_COPYRIGHT = 'https://www.openstreetmap.org/copyright';
const SOURCE_NAME = '臺中市政府夜間／急診動物醫院名冊';
const OSM_NAME = 'OpenStreetMap contributors';
const SOURCE_UPDATED_AT = '2026-06-15';
const VERIFIED_AT = '2026-10-08';

/**
 * 臺中市政府目前公開的夜間／急診名冊共 11 筆。
 * 名稱、電話與服務時段依政府名冊；有座標的 10 筆均核對門牌及行政區，來源為 OSM。
 * 永昌的地址定位回傳不同門牌，保留清單但不提供地圖標記或距離。
 * 一般門診名冊另有 282 筆，但未附座標，待逐筆補核後才加入地圖，避免錯誤落點。
 */
export const VET_HOSPITALS: VetHospital[] = [
  {
    id: 'taichung-jen-ai-east',
    name: '仁愛犬醫院',
    county: '臺中市',
    district: '東區',
    address: '臺中市東區進化路 122 號',
    phone: '04-22126987',
    latitude: 24.1451679,
    longitude: 120.6946419,
    sourceName: SOURCE_NAME,
    sourceUrl: TAICHUNG_EMERGENCY_SOURCE,
    coordinateSourceName: OSM_NAME,
    coordinateSourceUrl: OSM_COPYRIGHT,
    sourceUpdatedAt: SOURCE_UPDATED_AT,
    verifiedAt: VERIFIED_AT,
    isEmergency: true,
    emergencyServiceText: '21:00–24:00',
  },
  {
    id: 'taichung-hui-quan-west',
    name: '惠犬動物醫院',
    county: '臺中市',
    district: '西區',
    address: '臺中市西區美村路一段 631 號',
    phone: '04-23730123',
    latitude: 24.136977,
    longitude: 120.6618296,
    sourceName: SOURCE_NAME,
    sourceUrl: TAICHUNG_EMERGENCY_SOURCE,
    coordinateSourceName: OSM_NAME,
    coordinateSourceUrl: OSM_COPYRIGHT,
    sourceUpdatedAt: SOURCE_UPDATED_AT,
    verifiedAt: VERIFIED_AT,
    isEmergency: true,
    emergencyServiceText: '限舊客戶',
  },
  {
    id: 'taichung-national-west',
    name: '全國動物醫院',
    county: '臺中市',
    district: '西區',
    address: '臺中市西區五權八街 100 號',
    phone: '04-23710496',
    latitude: 24.1341584,
    longitude: 120.6622991,
    sourceName: SOURCE_NAME,
    sourceUrl: TAICHUNG_EMERGENCY_SOURCE,
    coordinateSourceName: OSM_NAME,
    coordinateSourceUrl: OSM_COPYRIGHT,
    sourceUpdatedAt: SOURCE_UPDATED_AT,
    verifiedAt: VERIFIED_AT,
    isEmergency: true,
    emergencyServiceText: '週一至週日 21:30–08:30',
  },
  {
    id: 'taichung-luo-da-yu-west',
    name: '羅大宇動物醫院',
    county: '臺中市',
    district: '西區',
    address: '臺中市西區存中街 153 號',
    phone: '04-23728378',
    latitude: 24.1411076,
    longitude: 120.6569646,
    sourceName: SOURCE_NAME,
    sourceUrl: TAICHUNG_EMERGENCY_SOURCE,
    coordinateSourceName: OSM_NAME,
    coordinateSourceUrl: OSM_COPYRIGHT,
    sourceUpdatedAt: SOURCE_UPDATED_AT,
    verifiedAt: VERIFIED_AT,
    isEmergency: true,
    emergencyServiceText: '21:30–23:00',
  },
  {
    id: 'taichung-zhong-tai-north',
    name: '中台動物醫院',
    county: '臺中市',
    district: '北區',
    address: '臺中市北區中清路一段 693 號',
    phone: '04-22922955',
    latitude: 24.1720419,
    longitude: 120.6715882,
    sourceName: SOURCE_NAME,
    sourceUrl: TAICHUNG_EMERGENCY_SOURCE,
    coordinateSourceName: OSM_NAME,
    coordinateSourceUrl: OSM_COPYRIGHT,
    sourceUpdatedAt: SOURCE_UPDATED_AT,
    verifiedAt: VERIFIED_AT,
    isEmergency: true,
    emergencyServiceText: '19:00–24:00',
  },
  {
    id: 'taichung-mu-en-north',
    name: '沐恩動物醫院',
    county: '臺中市',
    district: '北區',
    address: '臺中市北區健行路 865 號',
    phone: '04-22077271',
    latitude: 24.1590434,
    longitude: 120.6694535,
    sourceName: SOURCE_NAME,
    sourceUrl: TAICHUNG_EMERGENCY_SOURCE,
    coordinateSourceName: OSM_NAME,
    coordinateSourceUrl: OSM_COPYRIGHT,
    sourceUpdatedAt: SOURCE_UPDATED_AT,
    verifiedAt: VERIFIED_AT,
    isEmergency: true,
    emergencyServiceText: '21:00–02:00',
  },
  {
    id: 'taichung-tzu-ai-dali',
    name: '慈愛動物醫院中港分院',
    county: '臺中市',
    district: '大里區',
    address: '臺中市大里區國光路二段 539 號',
    phone: '04-24066688',
    latitude: 24.1116845,
    longitude: 120.6789053,
    sourceName: SOURCE_NAME,
    sourceUrl: TAICHUNG_EMERGENCY_SOURCE,
    coordinateSourceName: OSM_NAME,
    coordinateSourceUrl: OSM_COPYRIGHT,
    sourceUpdatedAt: SOURCE_UPDATED_AT,
    verifiedAt: VERIFIED_AT,
    isEmergency: true,
    isOpen24Hours: true,
    emergencyServiceText: '24 小時急診',
  },
  {
    id: 'taichung-chi-sheng-beitun',
    name: '濟生動物醫院',
    county: '臺中市',
    district: '北屯區',
    address: '臺中市北屯區北平路三段 75 之 12 號',
    phone: '04-22385886',
    latitude: 24.1712753,
    longitude: 120.6819876,
    sourceName: SOURCE_NAME,
    sourceUrl: TAICHUNG_EMERGENCY_SOURCE,
    coordinateSourceName: OSM_NAME,
    coordinateSourceUrl: OSM_COPYRIGHT,
    sourceUpdatedAt: SOURCE_UPDATED_AT,
    verifiedAt: VERIFIED_AT,
    isEmergency: true,
    isOpen24Hours: true,
    emergencyServiceText: '24 小時急診',
  },
  {
    id: 'taichung-yong-chang-beitun',
    name: '永昌動物醫院',
    county: '臺中市',
    district: '北屯區',
    address: '臺中市北屯區北屯路 32 號',
    phone: '04-22356236',
    sourceName: SOURCE_NAME,
    sourceUrl: TAICHUNG_EMERGENCY_SOURCE,
    coordinateSourceName: '位置待確認（地址定位回傳不同門牌）',
    coordinateSourceUrl: 'https://www.animal.taichung.gov.tw/1521448/1521543/1521544/1606060',
    sourceUpdatedAt: SOURCE_UPDATED_AT,
    verifiedAt: VERIFIED_AT,
    isEmergency: true,
    emergencyServiceText: '週一至週日 21:00–22:00',
  },
  {
    id: 'taichung-kang-de-beitun',
    name: '康德動物醫院',
    county: '臺中市',
    district: '北屯區',
    address: '臺中市北屯區崇德路二段 270 號',
    phone: '04-22412700',
    latitude: 24.1753364,
    longitude: 120.6859442,
    sourceName: SOURCE_NAME,
    sourceUrl: TAICHUNG_EMERGENCY_SOURCE,
    coordinateSourceName: OSM_NAME,
    coordinateSourceUrl: OSM_COPYRIGHT,
    sourceUpdatedAt: SOURCE_UPDATED_AT,
    verifiedAt: VERIFIED_AT,
    isEmergency: true,
    isOpen24Hours: true,
    emergencyServiceText: '24 小時急診',
  },
  {
    id: 'taichung-greenwich-nantun',
    name: '格林威治動物醫院',
    county: '臺中市',
    district: '南屯區',
    address: '臺中市南屯區文心路一段 486 號',
    phone: '04-23202279',
    latitude: 24.1520261,
    longitude: 120.6470341,
    sourceName: SOURCE_NAME,
    sourceUrl: TAICHUNG_EMERGENCY_SOURCE,
    coordinateSourceName: OSM_NAME,
    coordinateSourceUrl: OSM_COPYRIGHT,
    sourceUpdatedAt: SOURCE_UPDATED_AT,
    verifiedAt: VERIFIED_AT,
    isEmergency: true,
    isOpen24Hours: true,
    emergencyServiceText: '24 小時急診',
  },
];
