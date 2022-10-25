import fs from 'fs';
import { groupBy, shiftAllDataToStartFromZeroTimestamp } from './helpers';
import { mapTelemetryDataToEventFrameUserValues, mapTelemetryDataToMockApiTimelineSnapshot, mapTelemetryDataToTelemetryFrameUserValues } from './mappers';
import { generateInterpolatedElementsFromIncompleteData, SomethingWithTimestamp } from './utils';

//// Load command-line arguments
const [, , trueTelemetryJsonFilePathsString, fromMsString, toMsString, periodMsString] = process.argv;

//// Load raw data from json file
const trueTelemetryData = [] as SomethingWithTimestamp[];
const rawTelemetryJsonFilePaths = trueTelemetryJsonFilePathsString.replace(/"/g, '').split(",");
for (const filePath of rawTelemetryJsonFilePaths) {
  const jsonString = fs.readFileSync(filePath, 'utf8');
  const jsonData = JSON.parse(jsonString) as SomethingWithTimestamp[];
  trueTelemetryData.push(...jsonData)
}

trueTelemetryData.sort((a, b) => a.last_remote_timestamp - b.last_remote_timestamp);

const rawTelemetryDataGroupedByUserId = groupBy(trueTelemetryData, "user_id");
for (const user_id in rawTelemetryDataGroupedByUserId) {
  const data = rawTelemetryDataGroupedByUserId[user_id];
  shiftAllDataToStartFromZeroTimestamp(data);
}

const fromMs = fromMsString != undefined ? parseInt(fromMsString) : 0;
const toMs = fromMsString != undefined ? parseInt(toMsString) : trueTelemetryData[trueTelemetryData.length - 1].last_remote_timestamp;
const periodMs = periodMsString != undefined ? parseInt(periodMsString) : 30;
const propertiesWeDontWantToInterpolate = ['id', 'gear', 'status_flag', 'pak_sequence_id'];

const interpolatedTelemetryDataGroupedByUserId = {} as { [key: string]: SomethingWithTimestamp[] };
for (const user_id in rawTelemetryDataGroupedByUserId) {
  const userTrueTelemetryData = rawTelemetryDataGroupedByUserId[user_id];
  const userInterpolatedTelemetryData = generateInterpolatedElementsFromIncompleteData(
    userTrueTelemetryData,
    fromMs,
    toMs,
    periodMs,
    propertiesWeDontWantToInterpolate
  );
  interpolatedTelemetryDataGroupedByUserId[user_id] = userInterpolatedTelemetryData;
}

console.log(`interpolatedTelemetryDataGroupedByUserId`, interpolatedTelemetryDataGroupedByUserId);

!fs.existsSync("output") && fs.mkdirSync("output");

type SomeFrame = {
  raceTimestampMs: number; valuesByUserID: { [user_id: string]: any }
}
const event_frames = [] as SomeFrame[];
const telemetry_frames = [] as SomeFrame[];
const mockapi_frames = [] as any[];

const user_ids = Object.keys(interpolatedTelemetryDataGroupedByUserId);
for (const [index, { last_remote_timestamp }] of interpolatedTelemetryDataGroupedByUserId[user_ids[0]].entries()) {
  {
    const frame: SomeFrame = {
      raceTimestampMs: last_remote_timestamp,
      valuesByUserID: {},
    }
    for (const user_id in interpolatedTelemetryDataGroupedByUserId) {
      const user_data = interpolatedTelemetryDataGroupedByUserId[user_id][index];
      frame.valuesByUserID[user_id] = mapTelemetryDataToEventFrameUserValues(user_data);
    }
    event_frames.push(frame)
  }

  {
    const frame: SomeFrame = {
      raceTimestampMs: last_remote_timestamp,
      valuesByUserID: {},
    }
    for (const user_id in interpolatedTelemetryDataGroupedByUserId) {
      const user_data = interpolatedTelemetryDataGroupedByUserId[user_id][index];
      frame.valuesByUserID[user_id] = mapTelemetryDataToTelemetryFrameUserValues(user_data);
    }
    telemetry_frames.push(frame)
  }

  {
    const frame = {
      time: last_remote_timestamp,
      userStates: [] as any[],
    }
    for (const user_id in interpolatedTelemetryDataGroupedByUserId) {
      const user_data = interpolatedTelemetryDataGroupedByUserId[user_id][index];
      const user_state = mapTelemetryDataToMockApiTimelineSnapshot(user_data);
      frame.userStates.push(user_state);
    }
    mockapi_frames.push(frame)
  }
}

fs.writeFileSync("output/event_frames.json", JSON.stringify(event_frames, null, 2));
fs.writeFileSync("output/telemetry_frames.json", JSON.stringify(telemetry_frames, null, 2));
fs.writeFileSync("output/mockapi_frames.json", JSON.stringify(mockapi_frames, null, 2));
