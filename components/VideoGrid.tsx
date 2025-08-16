/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import {Scene} from '../types';
import {VideoCard} from './VideoCard';

interface VideoGridProps {
  scenes: Scene[];
  generatedImages: Record<string, string[]>;
  generatingSceneIds: Set<string>;
  isGlobalOperationRunning: boolean;
  aspectRatio: '16:9' | '9:16';
  onGenerateImage: (sceneId: string) => void;
  onUpdateScenePrompt: (sceneId: string, newPrompt: string) => void;
}

/**
 * A component that renders a grid of scene cards.
 */
export const VideoGrid: React.FC<VideoGridProps> = ({
  scenes,
  generatedImages,
  generatingSceneIds,
  isGlobalOperationRunning,
  aspectRatio,
  onGenerateImage,
  onUpdateScenePrompt,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {scenes.map((scene) => (
        <VideoCard
          key={scene.id}
          scene={scene}
          imageUrls={generatedImages[scene.id]}
          isLoading={generatingSceneIds.has(scene.id)}
          isGlobalOperationRunning={isGlobalOperationRunning}
          aspectRatio={aspectRatio}
          onGenerate={onGenerateImage}
          onUpdateScenePrompt={onUpdateScenePrompt}
        />
      ))}
    </div>
  );
};