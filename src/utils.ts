export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function unlerp(a: number, b: number, v: number): number {
  return (v - a) / (b - a);
}

/**
 * Flexible function to automatically interpolate all properties of given two objects and return a new object.
 * 
 * @param objectA  Object whose properties you want to interpolate from (or whose properties will remain in the result, in the case of no interpolation)
 * @param objectB  Object whose properties you want to interpolate to
 * @param interpolationPoint A number between 0 and 1, where 0 is objectA and 1 is objectB, and 0.5 is halfway between them, etc.
 * @param excludeProperties Use this to exclude properties you don't want to interpolate, such as "gear"
 * 
 * @returns A new object with interpolated properties (unless imporssible or excluded)
 */
export function lerpNumericObjectProperties<T extends Record<string, unknown>>(
  objectA: T,
  objectB: T,
  interpolationPoint: number,
  excludeProperties: (keyof T)[] = []
): T {
  const result = JSON.parse(JSON.stringify(objectA)) as T;

  for (const key in objectA) {
    const valueA = objectA[key];
    const valueB = objectB[key];

    const shouldLerpValue =
      //// Exclude properties that aren't numeric, like user_id and race_id
      //// This will also exclude properties that are null or undefined, which is perfect
      typeof valueA === 'number' &&
      typeof valueB === 'number' &&
      //// Exclude properties that are explicitly requested to be excluded via the method param
      !excludeProperties.includes(key as keyof T);

    if (shouldLerpValue) {
      //// If the above conditions are met, then we can interpolate this property
      //// between the two objects and assign it to the result object
      const lerpedValue = lerp(valueA, valueB, interpolationPoint) as T[keyof T];
      result[key as keyof T] = lerpedValue;
    }

    //// If the above conditions were NOT met, then we don't need to do anything and we can just
    //// leave the property to arbitrarily equal the one from objectA
  }

  return result;
}

export type SomethingWithTimestamp = {
  last_remote_timestamp: number,
  [key: string]: unknown,
};
/**
 * Ideally returns the two elements with property "last_remote_timestamp" that are closest to the given timestamp,
 * on the left and on the right side, as well as an interpolation point between them.
 * 
 * If the timestamp is smaller than the first element, then the first element will be returned twice, and the interpolation point will be 0.
 * If the timestamp is larger than the last element, then the last element will be returned twice, and the interpolation point will be 1.
 * 
 * @param array Array of objects with property "last_remote_timestamp"
 */
export function getClosestElementsAroundTimestamp<T extends SomethingWithTimestamp>(
  array: T[],
  targetTimestamp: number,
): [T, T, number] {
  if (array.length === 0) {
    throw new Error('Cannot get closest elements around timestamp of an empty array!');
  }

  if (array.length === 1) {
    return [array[0], array[0], 0];
  }

  const firstElement = array[0];
  const lastElement = array[array.length - 1];

  //// If the timestamp is less than the first element's timestamp, 
  //// then the first element will be returned twice, and the interpolation point will be 0.
  if (targetTimestamp <= firstElement.last_remote_timestamp) {
    return [firstElement, firstElement, 0];
  }

  //// If the timestamp is greater than the last element's timestamp,
  //// then the last element will be returned twice, and the interpolation point will be 1.
  if (targetTimestamp >= lastElement.last_remote_timestamp) {
    return [lastElement, lastElement, 1];
  }

  //// Now that we know we're within range, we can find the two elements that are closest to the timestamp
  //// starting with the first element that has a timestamp greater than the target timestamp, for the right side...
  const rightElementIndex = array.findIndex((element, index) => {
    return element.last_remote_timestamp >= targetTimestamp;
  });

  //// ...and then the element before that, for the left side
  const leftElementIndex = rightElementIndex - 1;

  const rightElement = array[rightElementIndex];
  const leftElement = array[leftElementIndex] ?? rightElement;

  //// Now we can calculate the interpolation point between the two elements
  //// This number should be between 0 and 1, where 0 is the left element and 1 is the right element
  //// And we already made sure it's within range, so hopefully we don't need to clamp it
  const interpolationPoint = unlerp(
    leftElement.last_remote_timestamp,
    rightElement.last_remote_timestamp,
    targetTimestamp,
  );

  return [leftElement, rightElement, interpolationPoint];
}

export function generateInterpolatedElementsFromIncompleteData<T extends SomethingWithTimestamp>(
  rawTelemetryData: T[],
  fromMs: number,
  toMs: number,
  period: number,
  excludeProperties: (keyof T)[] = [],
): T[] {
  const result: T[] = [];

  //// We need to loop through each period between the fromMs and toMs timestamps
  //// and find the two elements that are closest to the current period's timestamp
  //// and then interpolate between them
  for (let currentMs = fromMs; currentMs <= toMs; currentMs += period) {
    //// Get the two elements that are closest to the current period's timestamp
    //// and then interpolate between them
    const [leftElement, rightElement, interpolationPoint] = getClosestElementsAroundTimestamp(
      rawTelemetryData,
      currentMs,
    );

    //// Interpolate between the two elements and assign the result to the result array
    const interpolatedElement = lerpNumericObjectProperties(
      leftElement,
      rightElement,
      interpolationPoint,
      excludeProperties,
    );
    result.push(interpolatedElement);
  }

  return result;
}
