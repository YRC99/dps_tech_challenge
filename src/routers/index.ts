import express from "express";
const router = express.Router();

router.route("/").all((_req, res) => {
  res.statusCode = 200;
  console.log("Received a request to the root URL.");
  res.send("Hello, World!");
});
export { router };
