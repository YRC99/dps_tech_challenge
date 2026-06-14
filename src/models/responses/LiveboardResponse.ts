interface Departure {
  id: number;
  delay: number;
  station: string;
  stationinfo: {
    id: string;
    "@id": string;
    locationX: number;
    locationY: number;
    standardname: string;
    name: string;
  };
  time: number;
  vehicle: string;
  vehicleinfo: {
    name: string;
    shortname: string;
    "@id": string;
  };
  platform: number;
  platforminfo: {
    name: string;
    normal: string;
  };
  canceled: number;
  left: number;
  departureConnection: string;
  occupancy: {
    "@id": string;
    name: string;
  };
}

interface LiveboardResponse {
  version: string;
  timestamp: number;
  station: string;
  stationinfo: {
    id: string;
    "@id": string;
    locationX: number;
    locationY: number;
    standardname: string;
    name: string;
  };
  departures: {
    number: number;
    departure: Departure[];
  };
}
export type { Departure, LiveboardResponse };
