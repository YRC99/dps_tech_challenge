import express from "express";
import dotenv from "dotenv";
import axios from "axios";

import { departuresRouter as departures } from "./routers/departures.js";
import { router as index } from "./routers/index.js";
import { router as fallback } from "./routers/fallback.js";
import type { StationResponse } from "./models/responses/StationResponse.js";
import type { Station } from "./models/Station.js";
import { exit } from "process";

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

try {
  const stationData = await axios
    .get<StationResponse>("https://api.irail.be/stations?format=json")
    .then((response) => {
      const data: StationResponse = response.data;
      const result = data.station.map((station) => {
        return {
          id: station.id,
          name: station.name,
          standardname: station.standardname,
        };
      });
      return result as Station[];
    });

  //Middlewares
  app.use(express.json());

  //Routes
  app.use(departures(stationData));
  app.use(index);
  app.use(fallback);

  //Start the server
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
} catch (error) {
  console.error("Error fetching station data:", error);
  exit(1);
}
