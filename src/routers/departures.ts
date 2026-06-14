import express from "express";
import type { Station } from "../models/Station.js";
import axios from "axios";
import { timeLogger } from "../middlewares/timeLogger.js";
import type { LiveboardResponse } from "../models/responses/upstream/LiveboardResponse.js";
import Fuse from "fuse.js";
import type {
  DepartureEntry,
  StationDepartureEntry,
} from "../models/responses/DepartureEntry.js";
type DeparturesQuery = {
  q?: string;
};
const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     StationDepartureEntry:
 *       type: object
 *       required: [trainnumber, destination, time, delay]
 *       properties:
 *         trainnumber:
 *           type: string
 *           description: Train number/identifier.
 *           example: "IC 1832"
 *         destination:
 *           type: string
 *           description: Final destination station of the train.
 *           example: "Oostende"
 *         time:
 *           type: number
 *           description: Scheduled departure time as a Unix timestamp (seconds since epoch).
 *           example: 1781462940
 *         delay:
 *           type: number
 *           description: Current delay in seconds.
 *           example: 60
 *         timeString:
 *           type: string
 *           description: Human-readable departure time, including delay.
 *           example: "Departure Time including delay: 8:51:00 PM"
 *     SuccessfulDepartureEntry:
 *       type: object
 *       required: [station, type, departures]
 *       properties:
 *         station:
 *           type: string
 *           example: "Antwerpen-Centraal"
 *         type:
 *           type: string
 *           enum: [success]
 *         departures:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/StationDepartureEntry'
 *     ErrorDepartureEntry:
 *       type: object
 *       required: [station, type, error]
 *       properties:
 *         station:
 *           type: string
 *           example: "Antwerpen-Centraal"
 *         type:
 *           type: string
 *           enum: [error]
 *         error:
 *           type: string
 *           example: "Failed to fetch departures"
 *     DepartureEntry:
 *       oneOf:
 *         - $ref: '#/components/schemas/SuccessfulDepartureEntry'
 *         - $ref: '#/components/schemas/ErrorDepartureEntry'
 *     ErrorResponse:
 *       type: object
 *       required: [error]
 *       properties:
 *         error:
 *           type: string
 *           example: "Query parameter 'q' is required"
 */

export function departuresRouter(stations: Station[]) {
  router.use("/departures", timeLogger);
  /**
   * @openapi
   * /departures:
   *   description: >
   *     Any HTTP method other than GET on this path returns 405 Method Not Allowed.
   *   get:
   *     summary: Search for upcoming departures
   *     description: >
   *       Fuzzy-matches the `q` query parameter against known station names and
   *       returns, for each matching station, the departures scheduled within
   *       the next 15 minutes (accounting for delay).
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *           minLength: 3
   *         description: Station name search query (minimum 3 characters).
   *     responses:
   *       '200':
   *         description: Departures for the matching stations.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 content:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/DepartureEntry'
   *       '400':
   *         description: Missing or invalid `q` query parameter.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       '404':
   *         description: No matching stations, or no departures within 15 minutes.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
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
              const data = response.data;
              const departures = data.departures;
              const departuresForStation: StationDepartureEntry[] = [];
              departures.departure.forEach((departure) => {
                const time = Number(departure.time);
                const delay = Number(departure.delay);
                if (time + delay > maxTime) return;
                const trainnumber = departure.vehicleinfo.shortname;
                const destination = departure.stationinfo.standardname;
                departuresForStation.push({
                  trainnumber: trainnumber,
                  destination: destination,
                  time: time,
                  delay: delay,
                  timeString: `Departure Time including delay: ${new Date(
                    (Number(time) + Number(delay)) * 1000,
                  ).toLocaleTimeString()}`,
                });
              });
              if (departuresForStation.length === 0) return;
              const res: DepartureEntry = {
                station: response.data.stationinfo.standardname,
                type: "success",
                departures: departuresForStation,
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

      if (departuresList.length === 0) {
        res
          .status(404)
          .json({ error: "No departures found for the given query" });
      } else res.status(200).json({ content: departuresList });
    },
  );
  router.all("/departures", (req, res) => {
    res
      .status(405)
      .json({ error: `Method ${req.method} not allowed on /departures.` });
  });
  return router;
}
