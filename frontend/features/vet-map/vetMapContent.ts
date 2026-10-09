import type { VetHospital } from './vetHospitalData';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export function getHospitalCoordinate(hospital: VetHospital): Coordinate | undefined {
  const { latitude, longitude } = hospital;
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return undefined;
  return { latitude, longitude };
}

/** 系統地圖以官方登記地址找路，不以待核對或近似的標記座標導航。 */
export function getHospitalDirectionsUrl(hospital: VetHospital, platform: string) {
  const address = encodeURIComponent(hospital.address);
  return platform === 'ios'
    ? `https://maps.apple.com/?daddr=${address}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${address}`;
}

export function distanceInKm(from: Coordinate, to: Coordinate) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  const boundedValue = Math.min(1, Math.max(0, value));
  return 6371 * 2 * Math.atan2(Math.sqrt(boundedValue), Math.sqrt(1 - boundedValue));
}

const searchKey = (value: string) =>
  value.replace(/台/g, '臺').replace(/\s+/g, '').toLocaleLowerCase();

export function getVisibleHospitals(hospitals: VetHospital[], query: string, origin?: Coordinate) {
  const normalizedQuery = searchKey(query);
  const matching = hospitals.filter((hospital) => {
    if (!normalizedQuery) return true;
    return [
      hospital.name,
      hospital.county,
      hospital.district,
      hospital.address,
      hospital.emergencyServiceText,
      hospital.isOpen24Hours ? '24 小時 24小時 急診' : undefined,
    ]
      .filter(Boolean)
      .some((value) => searchKey(value!).includes(normalizedQuery));
  });

  if (!origin) return matching;
  return matching
    .map((hospital) => {
      const coordinate = getHospitalCoordinate(hospital);
      return { hospital, distance: coordinate ? distanceInKm(origin, coordinate) : Infinity };
    })
    .sort((a, b) => a.distance - b.distance)
    .map(({ hospital }) => hospital);
}

export function formatDistance(from: Coordinate, to: Coordinate) {
  const distance = distanceInKm(from, to);
  return distance < 1 ? `${Math.round(distance * 1000)} 公尺` : `${distance.toFixed(1)} 公里`;
}

export function formatHospitalDistance(origin: Coordinate, hospital: VetHospital) {
  const coordinate = getHospitalCoordinate(hospital);
  return coordinate ? formatDistance(origin, coordinate) : '位置待確認';
}
