import { lenVec3 } from "./helpers";

export function mapRawTelemetryFrameToEventFrameUserValues(
  frame: any
) {
  return {
    raceTimestampMs: frame.last_remote_timestamp,
    worldCoordinates: {
      x: frame.pos_x,
      y: frame.pos_y,
      z: frame.pos_z,
    },
    carRotationDegrees: {
      x: frame.rot_x,
      y: frame.rot_z,
      z: frame.rot_y,
    },
    lapProgressPercentage01Notation: 0
  }
}

export function mapRawTelemetryFrameToTelemetryFrameUserValues(
  frame: any
) {
  const vel_x_kmh = frame.vel_x * 3.6;
  const vel_y_kmh = frame.vel_y * 3.6;
  const vel_z_kmh = frame.vel_z * 3.6;

  // Convert timestamp from ms to s
  const timestamp_seconds = frame.last_remote_timestamp / 1000;
  const gforcex = vel_x_kmh / timestamp_seconds / 9.81
  const gforcez = vel_z_kmh / timestamp_seconds / 9.81

  return {
    raceTimestampMs: frame.last_remote_timestamp,
    GForceTuple: [gforcex, gforcez],
    speedKmh: Math.sqrt(vel_x_kmh * vel_x_kmh + vel_y_kmh * vel_y_kmh + vel_z_kmh * vel_z_kmh),
    RPM: frame.engine_rpm,
    centerOfGravityAcceleration: {
      lateral: gforcex,
      longitudinal: gforcez
    },
    steeringWheelAngleRadians: frame.wheel_angle,
    // For the time being, we can't callculate this due to lack of telemetry data, so it'll be always 0.
    // https://simwin.atlassian.net/browse/SIMWIN-591
    brakePressurePercentage01Notation: 0,
    throttlePressurePercentage01Notation: frame.gas / 255,
    gear: frame.gear,
    // For the time being, we don't have this data, so it'll be always 'false'.
    // https://simwin.atlassian.net/browse/SIMWIN-591
    hasABSActivated: false,
    hasTractionControlActivated: false
  };
}

export function mapRawTelemetryFrameToMockApiTimelineSnapshot(
  frame: any
) {
  const { vel_z, vel_y, vel_x,
    steer_angle, rot_z, rot_y, rot_x, pos_z, pos_y, pos_x, normalized_position,
    gear, gas, engine_rpm, } = frame;
  return {
    "rpm": engine_rpm,
    "speed": lenVec3(vel_x, vel_y, vel_z),
    "throttle": gas,
    "brake": 0,
    "steer": steer_angle,
    "gear": gear,
    "position": [pos_x, pos_y, pos_z],
    "rotation": [rot_x, rot_y, rot_z],
    "velocity": [vel_x, vel_y, vel_z,],
    "tractionControl": true,
    "abs": true
  };
}
