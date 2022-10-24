import fs from 'fs';
import { shiftAllDataToStartFromZeroTimestamp } from './helpers';
import { mapRawTelemetryFramesToEventFrameUserValues, mapRawTelemetryFramesToTelemetryFrameUserValues } from './mappers';
import { generateInterpolatedElementsFromIncompleteData, SomethingWithTimestamp } from './utils';

//// Load command-line arguments
const [, , rawTelemetryJsonFilePath, fromMsString, toMsString, periodMsString] = process.argv;

//// Load raw data from json file
const rawTelemetryJsonFilePathFixed = rawTelemetryJsonFilePath.replace(/"/g, '');
const rawTelemetryJsonString = fs.readFileSync(rawTelemetryJsonFilePathFixed, 'utf8');
const rawTelemetryData = JSON.parse(rawTelemetryJsonString) as SomethingWithTimestamp[];

const propertiesWeDontWantToInterpolate = ['id', 'gear', 'status_flag', 'pak_sequence_id'];

shiftAllDataToStartFromZeroTimestamp(rawTelemetryData);

const fromMs = fromMsString != undefined ? parseInt(fromMsString) : 0;
const toMs = fromMsString != undefined ? parseInt(toMsString) : rawTelemetryData[rawTelemetryData.length - 1].last_remote_timestamp;
const periodMs = periodMsString != undefined ? parseInt(periodMsString) : 30;

console.log({ fromMs, toMs, periodMs }, rawTelemetryData.length)
console.log({ rawTelemetryJsonFilePath, fromMsString, toMsString, periodMsString })

const interpolatedTelemetryData = generateInterpolatedElementsFromIncompleteData(
  rawTelemetryData,
  fromMs,
  toMs,
  periodMs,
  propertiesWeDontWantToInterpolate
);

console.log(interpolatedTelemetryData);

!fs.existsSync("output") && fs.mkdirSync("output");

fs.writeFileSync("output/interpolated.json", JSON.stringify(interpolatedTelemetryData, null, 2));

const event_frames = mapRawTelemetryFramesToEventFrameUserValues(interpolatedTelemetryData);
fs.writeFileSync("output/event_frames.json", JSON.stringify(event_frames, null, 2));

const telemetry_frames = mapRawTelemetryFramesToTelemetryFrameUserValues(interpolatedTelemetryData);
fs.writeFileSync("output/telemetry_frames.json", JSON.stringify(telemetry_frames, null, 2));