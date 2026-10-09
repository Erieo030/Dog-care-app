import {
  getVisibleHospitals,
  distanceInKm,
  formatDistance,
  getHospitalCoordinate,
  getHospitalDirectionsUrl,
  formatHospitalDistance,
} from '../vetMapContent';
import { VET_HOSPITALS, type VetHospital } from '../vetHospitalData';

const hospitals: VetHospital[] = [
  {
    id: 'near',
    name: '安心動物醫院',
    county: '臺北市',
    district: '大安區',
    address: '臺北市大安區測試路 1 號',
    latitude: 25.033,
    longitude: 121.543,
    sourceName: '測試資料',
    sourceUrl: 'https://example.invalid',
    coordinateSourceName: '測試座標',
    coordinateSourceUrl: 'https://example.invalid',
    sourceUpdatedAt: '2026-10-01',
    verifiedAt: '2026-10-01',
  },
  {
    id: 'far',
    name: '暖心獸醫診所',
    county: '臺北市',
    district: '士林區',
    address: '臺北市士林區測試路 2 號',
    latitude: 25.09,
    longitude: 121.52,
    sourceName: '測試資料',
    sourceUrl: 'https://example.invalid',
    coordinateSourceName: '測試座標',
    coordinateSourceUrl: 'https://example.invalid',
    sourceUpdatedAt: '2026-10-01',
    verifiedAt: '2026-10-01',
  },
];

describe('vet map content', () => {
  it('filters by hospital name, district, and address', () => {
    expect(getVisibleHospitals(hospitals, '大安').map((item) => item.id)).toEqual(['near']);
    expect(getVisibleHospitals(hospitals, '暖心').map((item) => item.id)).toEqual(['far']);
  });

  it('accepts both 台中 and 臺中 and ignores address spacing', () => {
    expect(getVisibleHospitals(VET_HOSPITALS, '台中市')).toHaveLength(VET_HOSPITALS.length);
    expect(getVisibleHospitals(VET_HOSPITALS, '國光路二段539號').map((item) => item.id)).toEqual([
      'taichung-tzu-ai-dali',
    ]);
  });

  it('sorts by distance only when a location is available', () => {
    const origin = { latitude: 25.034, longitude: 121.544 };
    expect(getVisibleHospitals(hospitals, '', origin).map((item) => item.id)).toEqual([
      'near',
      'far',
    ]);
    expect(getVisibleHospitals(hospitals, '').map((item) => item.id)).toEqual(['near', 'far']);
  });

  it('formats distances for readable clinic cards', () => {
    const origin = { latitude: 25.033, longitude: 121.543 };
    expect(distanceInKm(origin, origin)).toBe(0);
    expect(formatDistance(origin, origin)).toBe('0 公尺');
  });

  it('contains only the 11 documented Taichung night/emergency clinics in the first release', () => {
    expect(VET_HOSPITALS).toHaveLength(11);
    expect(VET_HOSPITALS.every((hospital) => hospital.county === '臺中市')).toBe(true);
    expect(VET_HOSPITALS.every((hospital) => hospital.sourceUpdatedAt === '2026-06-15')).toBe(true);
    expect(
      VET_HOSPITALS.filter(getHospitalCoordinate).every(
        (hospital) => hospital.coordinateSourceName === 'OpenStreetMap contributors',
      ),
    ).toBe(true);
    expect(VET_HOSPITALS.filter((hospital) => hospital.isOpen24Hours)).toHaveLength(4);
  });

  it('keeps clinics with unverified locations in the list without assigning a false marker or distance', () => {
    const clinic = VET_HOSPITALS.find((item) => item.id === 'taichung-yong-chang-beitun')!;
    expect(getHospitalCoordinate(clinic)).toBeUndefined();
    expect(formatHospitalDistance({ latitude: 24.15, longitude: 120.68 }, clinic)).toBe(
      '位置待確認',
    );
    const url = getHospitalDirectionsUrl(clinic, 'ios');
    expect(new URL(url).searchParams.get('daddr')).toBe(clinic.address);
    expect(url).not.toContain('24.1782441');
    expect(
      getVisibleHospitals(VET_HOSPITALS, '', { latitude: 24.15, longitude: 120.68 }).at(-1)?.id,
    ).toBe(clinic.id);
  });

  it('allows searching the documented emergency service hours', () => {
    expect(getVisibleHospitals(VET_HOSPITALS, '24 小時').map((item) => item.id)).toEqual([
      'taichung-tzu-ai-dali',
      'taichung-chi-sheng-beitun',
      'taichung-kang-de-beitun',
      'taichung-greenwich-nantun',
    ]);
    expect(getVisibleHospitals(VET_HOSPITALS, '限舊客戶').map((item) => item.id)).toEqual([
      'taichung-hui-quan-west',
    ]);
  });
});
