import express from "express";
const router = express.Router();

/**
 * @openapi
 * /:
 *   get:
 *     summary: Health check
 *     description: Returns a simple greeting to confirm the server is running.
 *     responses:
 *       '200':
 *         description: Greeting message.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Hello, World!"
 */
router.route("/").all((_req, res) => {
  res.statusCode = 200;
  console.log("Received a request to the root URL.");
  res.send("Hello, World!");
});
export { router };
