import "reflect-metadata";
import { DataSource } from "typeorm";
import { loadEnvironment } from "../config/environment.js";
import { databaseOptions } from "./options.js";

export default new DataSource(databaseOptions(loadEnvironment()));
