import express from "express";
const timeLogger = (
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction,
) => {
  console.log("------------------");
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Request URL: ${req.originalUrl}`);
  console.log(`Request Method: ${req.method}`);
  console.log("------------------");
  next();
};
export { timeLogger };
