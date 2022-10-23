// import fs from 'fs';
// import { generateInterpolatedElementsFromIncompleteData } from './utils';

const fs = require('fs');
const { generateInterpolatedElementsFromIncompleteData } = require('./utils');

const [, , rawTelemetryJsonFilePath, fromMsString, toMsString, periodString] = process.argv;

const rawTelemetryJsonFilePathFixed = rawTelemetryJsonFilePath.replace(/"/g, '');
const rawTelemetryJsonString = fs.readFileSync(rawTelemetryJsonFilePathFixed, 'utf8');
const rawTelemetryData = JSON.parse(rawTelemetryJsonString);

const fromMs = parseInt(fromMsString);
const toMs = parseInt(toMsString);
const period = parseInt(periodString);

const interpolatedTelemetryData = generateInterpolatedElementsFromIncompleteData(rawTelemetryData, fromMs, toMs, period, ["id", "gear", "status_flag", "pak_sequence_id"]);

console.log(interpolatedTelemetryData);
