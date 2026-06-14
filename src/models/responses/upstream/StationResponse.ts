interface StationResponse {
  version: string;
  timestamp: number;
  station: {
    id: string;
    "@id": string;
    locationX: number;
    locationY: number;
    standardname: string;
    name: string;
  }[];
}
export type { StationResponse };
