import * as express from 'express';
import {Express, Request, Response, NextFunction} from "express-serve-static-core";
import  { default as healthRoutes } from './modules/health/health.routes';
import * as dotenv from 'dotenv'
dotenv.config();
import "./database";

const app: Express = express();
app.use(express.json());

app.use('/api/v1/health', healthRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running in http://localhost:${PORT}`)
});