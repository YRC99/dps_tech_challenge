import express from "express";

const router = express.Router();
router.use((_req, res) => {
  console.log("Received a request to an undefined route.");
  res.status(404).send("There is no route for this URL.");
});
export { router };
