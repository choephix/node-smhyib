import fs from 'fs';
import { generateInterpolatedElementsFromIncompleteData } from './utils';

//// Load command-line arguments
const [, , rawTelemetryJsonFilePath, fromMsString, toMsString, periodString] = process.argv;
const fromMs = parseInt(fromMsString);
const toMs = parseInt(toMsString);
const period = parseInt(periodString);

//// Load raw data from json file
const rawTelemetryJsonFilePathFixed = rawTelemetryJsonFilePath.replace(/"/g, '');
const rawTelemetryJsonString = fs.readFileSync(rawTelemetryJsonFilePathFixed, 'utf8');
const rawTelemetryData = JSON.parse(rawTelemetryJsonString);

const propertiesWeDontWantToInterpolate = ['id', 'gear', 'status_flag', 'pak_sequence_id'];

//// 
const interpolatedTelemetryData = generateInterpolatedElementsFromIncompleteData(
  rawTelemetryData,
  fromMs,
  toMs,
  period,
  propertiesWeDontWantToInterpolate
);

console.log(interpolatedTelemetryData);
