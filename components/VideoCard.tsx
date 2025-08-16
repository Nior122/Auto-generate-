/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, {useState} from 'react';
import {Scene} from '../types';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  SparklesIcon,
} from './icons';

interface SceneCardProps {
  scene: Scene;
  imageUrls?: string[];
  isLoading: boolean;
  isGlobalOperationRunning: boolean;
  aspectRatio: '16:9' | '9:16';
  onGenerate: (sceneId: string) => void;
  onUpdateScenePrompt: (sceneId: string, newPrompt: string) => void;
}

const LoadingSpinner: React.FC = () => (
  <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-purple-500"></div>
);

const handleDownload = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * A component that renders a scene card with a prompt, and a generated image or a generate button.
 */
export const VideoCard: React.FC<SceneCardProps> = ({
  scene,
  imageUrls,
  isLoading,
  isGlobalOperationRunning,
  aspectRatio,
  onGenerate,
  onUpdateScenePrompt,
}) => {
  const aspectRatioClass =
    aspectRatio === '16:9' ? 'aspect-w-16 aspect-h-9' : 'aspect-w-9 aspect-h-16';

  const [isEditing, setIsEditing] = useState(false);
  const [editablePrompt, setEditablePrompt] = useState(scene.prompt);
  const isDisabled = isLoading || isGlobalOperationRunning;

  const handleSave = () => {
    onUpdateScenePrompt(scene.id, editablePrompt);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditablePrompt(scene.prompt);
  };

  return (
    <div className="flex flex-col bg-gray-800/50 rounded-lg overflow-hidden shadow-lg transition-all duration-300 h-full">
      <div className="relative bg-gray-900">
        {isLoading ? (
          <div
            className={`flex items-center justify-center ${aspectRatioClass}`}
          >
            <LoadingSpinner />
          </div>
        ) : imageUrls && imageUrls.length > 0 ? (
          <div className="p-2">
            <div className={`relative group ${aspectRatioClass}`}>
              <img
                src={imageUrls[0]}
                alt={scene.prompt}
                className="w-full h-full object-cover animate-fade-in rounded-md cursor-pointer"
                onClick={() =>
                  handleDownload(imageUrls[0], `scene_${scene.scene}.jpeg`)
                }
              />
              <div className="absolute top-2 right-2 z-10">
                <button
                  type="button"
                  onClick={() =>
                    handleDownload(imageUrls[0], `scene_${scene.scene}.jpeg`)
                  }
                  className="p-2 rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80 transition-all"
                  aria-label={`Download image for scene ${scene.scene}`}
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`flex items-center justify-center ${aspectRatioClass}`}
          >
            <div className="text-center p-4">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed"
                onClick={() => onGenerate(scene.id)}
                disabled={isDisabled}
                aria-label={`Generate image for scene ${scene.scene}`}
              >
                <SparklesIcon className="w-5 h-5" />
                <span>Generate Image</span>
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="text-lg font-bold text-gray-200">
            Scene {scene.scene}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                disabled={isDisabled}
                className="p-2 rounded-full bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Edit prompt for scene ${scene.scene}`}
              >
                <PencilSquareIcon className="w-5 h-5" />
              </button>
            )}
            {imageUrls && imageUrls.length > 0 && (
              <button
                type="button"
                onClick={() => onGenerate(scene.id)}
                disabled={isDisabled}
                className="p-2 rounded-full bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Regenerate image for scene ${scene.scene}`}
              >
                <ArrowPathIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="flex-grow flex flex-col">
            <textarea
              value={editablePrompt}
              onChange={(e) => setEditablePrompt(e.target.value)}
              className="w-full flex-grow bg-gray-900 border border-gray-700 rounded-md p-2 text-sm text-gray-300 focus:ring-purple-500 focus:border-purple-500 transition-shadow"
              rows={5}
              aria-label={`Editing prompt for scene ${scene.scene}`}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={handleCancel}
                className="px-4 py-1.5 rounded-md text-sm font-semibold bg-gray-600 hover:bg-gray-500 text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 rounded-md text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 flex-grow">{scene.prompt}</p>
        )}
      </div>
    </div>
  );
};