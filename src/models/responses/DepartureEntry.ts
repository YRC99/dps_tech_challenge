interface SuccessfulDepartureEntry {
  station: string;
  type: "success";
  departures: {
    trainnumber: string;
    destination: string;
    time: number;
    timeString?: string;
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
