import fs from 'fs';
import { groupBy, shiftAllDataToStartFromZeroTimestamp } from './helpers';
import { mapTelemetryDataToEventFrameUserValues, mapTelemetryDataToMockApiTimelineSnapshot, mapTelemetryDataToTelemetryFrameUserValues } from './mappers';
import { generateInterpolatedElementsFromIncompleteData, SomethingWithTimestamp } from './utils';

//// Load command-line arguments
const [, , trueTelemetryJsonFilePathsString, fromMsString, toMsString, periodMsString] = process.argv;

//// Load raw data from multiple json files and merge them all into one array
const trueTelemetryData = [] as SomethingWithTimestamp[];
const rawTelemetryJsonFilePaths = trueTelemetryJsonFilePathsString.replace(/"/g, '').split(",");
for (const filePath of rawTelemetryJsonFilePaths) {
  const jsonString = fs.readFileSync(filePath, 'utf8');
  const jsonData = JSON.parse(jsonString) as SomethingWithTimestamp[];
  trueTelemetryData.push(...jsonData)
}

//// Just in case
trueTelemetryData.sort((a, b) => a.last_remote_timestamp - b.last_remote_timestamp);

/**
 * Now take the elements of that one big array and group them by user_id.
 * The result would be an object looking like ```
 * {
 *   "mock3|194.187.155.222": [ ... ],
 *   "mock2|180.254.66.61": [ ... ],
 *   ...
 * }
 * ```
 */
const trueTelemetryDataGroupedByUserId = groupBy(trueTelemetryData, "user_id");

/**
 * Clean up the mock data somewhat.
 * Useful for broken true data, or when merging multiple races.
 */
for (const user_id in trueTelemetryDataGroupedByUserId) {
  const data = trueTelemetryDataGroupedByUserId[user_id] as any[];
  if (data.length < 1000) {
    //// This is a fix for some of the older broken data that wasn't properly assigned user_ids
    //// If the array is relatively short, just take that user out of the thing
    delete trueTelemetryDataGroupedByUserId[user_id];
  } else {
    //// Clip all the frames at the beginning, where the car didn't move at all
    while (data[0]?.normalized_position == data[1]?.normalized_position) {
      data.shift();
    }
    //// Shift all array items, so that they start from zero
    shiftAllDataToStartFromZeroTimestamp(data);
  }

  console.log(user_id, data.length);
}

//// Prep the params for the interpolation we'll be doing
const fromMs = fromMsString != undefined ? parseInt(fromMsString) : 0;
const toMs = fromMsString != undefined ? parseInt(toMsString) : trueTelemetryData[trueTelemetryData.length - 1].last_remote_timestamp;
const periodMs = periodMsString != undefined ? parseInt(periodMsString) : 30;
const propertiesWeDontWantToInterpolate = ['id', 'gear', 'status_flag', 'pak_sequence_id'];

//// The meat
//// Here we create a new object with "grouped" data, but this time instead of the true data
//// we'll have for each user in there elements from "fromMs" to "toMs" at interval of "periodMs"
//// with values interpolated from the "true" data we prepared.
const interpolatedTelemetryDataGroupedByUserId = {} as { [key: string]: SomethingWithTimestamp[] };
for (const user_id in trueTelemetryDataGroupedByUserId) {
  const userTrueTelemetryData = trueTelemetryDataGroupedByUserId[user_id];
  const userInterpolatedTelemetryData = generateInterpolatedElementsFromIncompleteData(
    userTrueTelemetryData,
    fromMs,
    toMs,
    periodMs,
    propertiesWeDontWantToInterpolate
  );
  interpolatedTelemetryDataGroupedByUserId[user_id] = userInterpolatedTelemetryData;
}

//// Now we should have in "interpolatedTelemetryDataGroupedByUserId" objects shaped like the original data
//// but with interpolated values and grouped by "user_id".

//// Below is just some code to adapt it into three different kinds of objects for use in the actual project.
//// "event_frames" and "telemetry_frames" are the shapes we use for the results of their corresponding endpoints,
//// and "mockapi_frames" is just the type of objects easiest for the Mock Api to understand without modifying it.

type SomeApiFrame = {
  raceTimestampMs: number; valuesByUserID: { [user_id: string]: any }
}
const event_frames = [] as SomeApiFrame[];
const telemetry_frames = [] as SomeApiFrame[];
const mockapi_frames = [] as any[];

const user_ids = Object.keys(interpolatedTelemetryDataGroupedByUserId);
for (const [index, { last_remote_timestamp }] of interpolatedTelemetryDataGroupedByUserId[user_ids[0]].entries()) {
  {
    const frame: SomeApiFrame = {
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
    const frame: SomeApiFrame = {
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

!fs.existsSync("output") && fs.mkdirSync("output");
fs.writeFileSync("output/event_frames.json", JSON.stringify(event_frames, null, 2));
fs.writeFileSync("output/telemetry_frames.json", JSON.stringify(telemetry_frames, null, 2));
fs.writeFileSync("output/mockapi_frames.json", JSON.stringify(mockapi_frames, null, 2));
