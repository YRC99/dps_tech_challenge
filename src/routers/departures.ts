import express from "express";
import type { Station } from "../models/Station.js";
import axios from "axios";
import { timeLogger } from "../middlewares/timeLogger.js";
import type { LiveboardResponse } from "../models/responses/upstream/LiveboardResponse.js";
import Fuse from "fuse.js";
import type { DepartureEntry } from "../models/responses/DepartureEntry.js";
type DeparturesQuery = {
  q?: string;
};
const router = express.Router();
export function departuresRouter(stations: Station[]) {
  router.use("/departures", timeLogger);

  router.get(
    "/departures",
    async (req: express.Request<{}, {}, {}, DeparturesQuery>, res) => {
      const search = req.query.q;
      if (!search) {
        res.status(400).json({ error: "Query parameter 'q' is required" });
        return;
      }
      if (search.length < 3) {
        res.status(400).json({
          error: "Query parameter 'q' must be at least 3 characters long",
        });
        return;
      }
      const fuse = new Fuse(stations, {
        keys: ["name", "standardname"],
        threshold: 0.3,
        ignoreLocation: true,
        isCaseSensitive: false,
      });
      const candidates = fuse.search(search).map((result) => result.item);
      //fetched q from query paramters, now search stations
      if (candidates.length === 0) {
        res
          .status(404)
          .json({ error: "No departures found for the given query" });
        return;
      }
      const departuresList: DepartureEntry[] = [];

      //15 minutes into the future (seconds due to the API using unix timestamps in seconds)
      const now = Math.floor(Date.now() / 1000);
      const maxTime = Math.floor(now + 15 * 60);
      await Promise.all(
        candidates.map((station) =>
          axios
            .get<LiveboardResponse>(
              `https://api.irail.be/liveboard?id=${station.id}&arrdep=departure&format=json`,
            )
            .then((response: { data: LiveboardResponse }) => {
              let data = response.data;
              let departures = data.departures;
              let res: DepartureEntry = {
                station: response.data.stationinfo.standardname,
                type: "success",
                departures: departures.departure.map((departure) => {
                  return {
                    trainnumber: departure.vehicleinfo.shortname,
                    destination: departure.stationinfo.standardname,
                    time: departure.time,
                    delay: departure.delay,
                    timeString: `Departure Time including delay: ${new Date(
                      (Number(departure.time) + Number(departure.delay)) * 1000,
                    ).toLocaleTimeString()}`,
                  };
                }),
              };
              departuresList.push(res);
            })
            .catch((error) => {
              console.error(
                "Error fetching departures for station:",
                station.name,
                error,
              );
              departuresList.push({
                station: station.name,
                type: "error",
                error: "Failed to fetch departures",
              });
            }),
        ),
      );
      let filteredDepartures = departuresList
        .map((departure) => {
          if (departure.type === "success")
            departure.departures = departure.departures.filter(
              (departure) =>
                Number(departure.time) + Number(departure.delay) <= maxTime,
            );
          return departure;
        })
        .filter((d) => d.type === "error" || d.departures.length > 0);
      if (filteredDepartures.length === 0) {
        res
          .status(404)
          .json({ error: "No departures found for the given query" });
      } else res.status(200).json({ content: filteredDepartures });
    },
  );
  router.all("/departures", (req, res) => {
    res
      .status(405)
      .json({ error: `Method ${req.method} not allowed on /departures.` });
  });
  return router;
}
