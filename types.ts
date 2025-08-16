/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Interface defining the structure of a scene object, including its ID, number,
 * script, and image prompt.
 */
export interface Scene {
  id: string;
  scene: number;
  script: string;
  prompt: string;
}

/**
 * Interface defining the structure of a video object.
 */
export interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
}
