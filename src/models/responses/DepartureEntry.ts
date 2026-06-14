interface SuccessfulDepartureEntry {
  station: string;
  type: "success";
  departures: {
    trainnumber: string;
    destination: string;
    time: number;
    delay: number;
  }[];
}
interface ErrorDepartureEntry {
  station: string;
  type: "error";
  error: string;
}
type DepartureEntry = SuccessfulDepartureEntry | ErrorDepartureEntry;
export type { DepartureEntry };
