export type SomethingWithTimestamp = {
  last_remote_timestamp: number,
  [key: string]: unknown,
};

/**
 * Mutates the given array so that the "timeline" of its elements starts from zero,
 * by iterating over every element and reducing its "first_element_timestamp" property by
 * the "first_element_timestamp" property value of the first element.
 * 
 * Assuming the given array was properly sorted with the earliest piece of data at the beginning,
 * this should make sure there is no long pause with nothing happening at the beginning. 
 */
export function shiftAllDataToStartFromZeroTimestamp<T extends SomethingWithTimestamp>(
  array: T[],
) {
  const first_element_timestamp = array[0].last_remote_timestamp;

  for (const element of array) {
    element.last_remote_timestamp -= first_element_timestamp;
  }

  return array;
}

export function groupBy<T, K extends string & keyof T>(xs: T[], key: K) {
  return xs.reduce(function (rv: any, x) {
    const group = (rv[x[key]] = rv[x[key]] || []);
    group.push(x);
    return rv;
  }, {} as { [key: string]: T[] });
};

/** Returns the length of a 3D vector */
export function lenVec3(x: number, y: number, z: number) {
  return Math.sqrt(x * x + y * y + z * z);
};

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
