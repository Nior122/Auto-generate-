/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, {useState, useRef, useEffect} from 'react';
import {ErrorModal} from './components/ErrorModal';
import {
  CameraIcon,
  SignOutIcon,
  SparklesIcon,
  StopIcon,
  TikTokRatioIcon,
  TrashIcon,
  YouTubeRatioIcon,
} from './components/icons';
import {PdfUploadPage} from './components/PdfUploadPage';
import {Scene, User} from './types';
import {VideoGrid} from './components/VideoGrid';

import {GoogleGenAI, Type} from '@google/genai';

const IMAGEN_MODEL_NAME = 'imagen-3.0-generate-002';
const TEXT_MODEL_NAME = 'gemini-2.5-flash';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

type AspectRatio = '16:9' | '9:16';

// Add google to the window interface
declare global {
  interface Window {
    google: any;
  }
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

function jwtDecode<T>(token: string): T | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Invalid token', error);
    return null;
  }
}

async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {data: await base64EncodedDataPromise, mimeType: file.type},
  };
}

async function generateImageForScene(
  scene: Scene,
  aspectRatio: AspectRatio,
  characterStyle: {character_description: string; artistic_style: string} | null,
): Promise<string[]> {
  const qualityKeywords =
    'masterpiece, best quality, high quality, absurdres, ultra-detailed';

  let finalPrompt = scene.prompt;

  if (characterStyle) {
    // Construct a more explicit prompt that separates style, scene, and character requirements.
    finalPrompt = `
      In the specific artistic style of "${characterStyle.artistic_style}", generate the following scene:
      "${scene.prompt}"
      CRITICAL: The main character(s) in this scene MUST strictly conform to this detailed description: "${characterStyle.character_description}". This is a mandatory requirement.
      IMPORTANT FOR TEXT: If the scene description includes text, render it with extreme accuracy and detail as specified.
    `;
  }

  // Append quality keywords for a final boost.
  finalPrompt = `${finalPrompt}. Technical keywords for quality: ${qualityKeywords}.`;

  try {
    const response = await ai.models.generateImages({
      model: IMAGEN_MODEL_NAME,
      prompt: finalPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: aspectRatio,
        outputMimeType: 'image/jpeg',
      },
    });

    return response.generatedImages.map(
      (image) => `data:image/jpeg;base64,${image.image.imageBytes}`,
    );
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : 'An unknown error occurred';
    throw new Error(
      `Image generation failed for scene ${scene.scene}: ${message}`,
    );
  }
}

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [characterImage, setCharacterImage] = useState<File | null>(null);
  const [characterStyle, setCharacterStyle] = useState<{
    character_description: string;
    artistic_style: string;
  } | null>(null);
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<
    Record<string, string[]>
  >({});
  const [generatingSceneIds, setGeneratingSceneIds] = useState<Set<string>>(
    new Set(),
  );
  const [error, setError] = useState<string[] | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const stopGenerationRef = useRef(false);
  const characterImageInputRef = useRef<HTMLInputElement>(null);

  const handleLoginSuccess = (credentialResponse: any) => {
    const decoded = jwtDecode<{name: string; email: string; picture: string}>(
      credentialResponse.credential,
    );
    if (decoded) {
      setUser({
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture,
      });
    }
  };

  const handleSignOut = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
    setUser(null);
    setScenes([]);
    setGeneratedImages({});
    setCharacterImage(null);
    setCharacterStyle(null);
  };

  useEffect(() => {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      console.warn(
        'Google Client ID is not configured. Running in demo mode.',
      );
      setUser({
        name: 'Demo User',
        email: 'demo@example.com',
        picture: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23ddd'/%3E%3Ctext x='50' y='55' font-family='Arial' font-size='40' fill='%23555' text-anchor='middle' dominant-baseline='middle'%3EDU%3C/text%3E%3C/svg%3E`,
      });
      return;
    }

    const intervalId = setInterval(() => {
      if (window.google) {
        clearInterval(intervalId);
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleLoginSuccess,
        });

        const signInButtonContainer = document.getElementById('signInButton');
        if (signInButtonContainer) {
          window.google.accounts.id.renderButton(signInButtonContainer, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: 'signin_with',
            shape: 'rectangular',
          });
        }
        window.google.accounts.id.prompt();
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, []);

  const handlePdfUpload = async (file: File) => {
    setIsProcessingPdf(true);
    setError(null);
    setScenes([]);
    setGeneratedImages({});
    try {
      const pdfPart = await fileToGenerativePart(file);
      const prompt = `You are a professional screenwriter. Read the following script from a PDF. Your task is to break it down into individual scenes. For each scene, provide:
1.  The scene number.
2.  A concise summary of the action and dialogue in the "script" field.
3.  A detailed, visually descriptive prompt for an AI image generator in the "prompt" field. This prompt should describe the characters, setting, lighting, and camera angle.
URGENT & CRITICAL: For any text that must appear in the image, you must provide an extremely detailed description. Follow this format with extreme precision: "A [adjective] [object] has the text '[the exact text]' written on it. The lettering is [style/font/color], and has a [weathered/new/glowing] appearance." This is the ONLY way to ensure text is rendered correctly. Simple descriptions will fail. For example: "A close-up shot of an ancient, salt-stained wooden pirate chest. Carved into the lid are the words 'DEAD MAN'S TALES' in a rough, jagged font. The letters look worn and are filled with a faint, eerie green moss."
For text meant to be an overlay, use this format: "Text overlay: 'Meanwhile...'".
Do not add any commentary or explanation outside of the JSON response.
The response should be a JSON array of scenes.`;

      const response = await ai.models.generateContent({
        model: TEXT_MODEL_NAME,
        contents: {parts: [pdfPart, {text: prompt}]},
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                scene: {type: Type.NUMBER},
                script: {type: Type.STRING},
                prompt: {type: Type.STRING},
              },
              required: ['scene', 'script', 'prompt'],
            },
          },
        },
      });

      const parsedScenes = JSON.parse(response.text).map((s: any) => ({
        ...s,
        id: self.crypto.randomUUID(),
      }));
      setScenes(parsedScenes);
    } catch (e) {
      console.error(e);
      const message =
        e instanceof Error ? e.message : 'An unknown error occurred';
      setError(['Failed to process PDF.', message]);
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const handleCharacterImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCharacterImage(file);
    setIsAnalyzingStyle(true);
    setError(null);
    try {
      const imagePart = await fileToGenerativePart(file);
      const prompt = `Analyze the attached image of a character. Your goal is to create a reusable style description for an AI image generator.
You must provide a detailed breakdown of the character's physical appearance and the overall artistic style of the image.
Respond with a single JSON object containing two keys:
1. "character_description": A highly detailed description of the character, including their clothing, hair style and color, facial features, and any notable accessories.
2. "artistic_style": A description of the overall artistic style. For example: "Pixar-style 3D animation", "Gritty, realistic concept art", "Ghibli-inspired watercolor anime", "Classic 1990s comic book art".`;

      const response = await ai.models.generateContent({
        model: TEXT_MODEL_NAME,
        contents: {parts: [imagePart, {text: prompt}]},
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              character_description: {type: Type.STRING},
              artistic_style: {type: Type.STRING},
            },
            required: ['character_description', 'artistic_style'],
          },
        },
      });

      setCharacterStyle(JSON.parse(response.text));
    } catch (e) {
      console.error(e);
      const message =
        e instanceof Error ? e.message : 'An unknown error occurred';
      setError(['Failed to analyze character style.', message]);
      setCharacterStyle(null);
      setCharacterImage(null);
    } finally {
      setIsAnalyzingStyle(false);
    }
  };

  const handleGenerateImage = async (sceneId: string) => {
    const scene = scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    setGeneratingSceneIds((prev) => new Set(prev).add(sceneId));
    setError(null);

    try {
      const urls = await generateImageForScene(
        scene,
        aspectRatio,
        characterStyle,
      );
      setGeneratedImages((prev) => ({...prev, [sceneId]: urls}));
    } catch (e) {
      console.error(e);
      const message =
        e instanceof Error
          ? e.message
          : `An unknown error occurred during image generation for scene ${scene.scene}.`;
      setError([`Failed to generate image for scene ${scene.scene}.`, message]);
    } finally {
      setGeneratingSceneIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sceneId);
        return newSet;
      });
    }
  };

  const handleUpdateScenePrompt = (sceneId: string, newPrompt: string) => {
    setScenes(
      scenes.map((s) => (s.id === sceneId ? {...s, prompt: newPrompt} : s)),
    );
  };

  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    stopGenerationRef.current = false;

    const scenesToGenerate = scenes.filter((s) => !generatedImages[s.id]);

    for (const scene of scenesToGenerate) {
      if (stopGenerationRef.current) {
        console.log('Generation stopped by user.');
        break;
      }
      await handleGenerateImage(scene.id);
      await delay(1000); // Delay to avoid overwhelming the API
    }

    setIsGeneratingAll(false);
    stopGenerationRef.current = false;
  };

  const handleStopGeneration = () => {
    stopGenerationRef.current = true;
  };

  const handleClearCharacter = () => {
    setCharacterImage(null);
    setCharacterStyle(null);
    if (characterImageInputRef.current) {
      characterImageInputRef.current.value = '';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center justify-center p-4 animate-fade-in">
        {error && <ErrorModal message={error} onClose={() => setError(null)} />}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text inline-flex items-center gap-4">
            <SparklesIcon className="w-10 h-10 md:w-12 md:h-12" />
            <span>Storyboard Generator</span>
          </h1>
          <p className="text-gray-400 mt-2 text-lg">
            Sign in with your Google account to create your story.
          </p>
        </div>
        <div
          id="signInButton"
          className="transition-opacity duration-300"
        ></div>
      </div>
    );
  }

  const isGlobalOperationRunning = isGeneratingAll || isAnalyzingStyle;

  const AppHeader = () => (
    <header className="mb-6 pb-6 border-b border-gray-700/50 flex flex-wrap justify-between items-center gap-4">
      <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text inline-flex items-center gap-3">
        <SparklesIcon className="w-8 h-8 md:w-10 md:h-10" />
        <span>Storyboard Generator</span>
      </h1>
      <div className="flex items-center gap-3">
        <img
          src={user.picture}
          alt="User profile"
          className="w-10 h-10 rounded-full border-2 border-gray-600"
        />
        <div className="text-right hidden sm:block">
          <div className="font-semibold text-white">{user.name}</div>
          <div className="text-xs text-gray-400">{user.email}</div>
        </div>
        <button
          onClick={handleSignOut}
          className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          aria-label="Sign out"
        >
          <SignOutIcon className="w-6 h-6" />
        </button>
      </div>
    </header>
  );

  if (scenes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-6 lg:p-8 animate-fade-in">
        <AppHeader />
        <main>
          <PdfUploadPage
            onPdfUpload={handlePdfUpload}
            isProcessing={isProcessingPdf}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-6 lg:p-8 animate-fade-in">
      {error && <ErrorModal message={error} onClose={() => setError(null)} />}
      <AppHeader />
      <main>
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <div className="relative">
            <input
              type="file"
              id="character-upload"
              accept="image/*"
              className="sr-only"
              ref={characterImageInputRef}
              onChange={handleCharacterImageUpload}
              disabled={isGlobalOperationRunning}
            />
            <label
              htmlFor="character-upload"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                isGlobalOperationRunning
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <CameraIcon className="w-5 h-5" />
              <span>
                {characterImage ? 'Change Character' : 'Upload Character'}
              </span>
            </label>
          </div>
          {characterImage && (
            <div className="flex items-center gap-3 bg-gray-800 p-2 rounded-lg">
              <img
                src={URL.createObjectURL(characterImage)}
                alt="Character reference"
                className="w-10 h-10 rounded-md object-cover"
              />
              <span className="text-sm text-gray-300">
                {isAnalyzingStyle
                  ? 'Analyzing style...'
                  : 'Character style applied'}
              </span>
              <button
                type="button"
                onClick={handleClearCharacter}
                disabled={isGlobalOperationRunning}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Clear character reference"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 p-1 bg-gray-800 rounded-lg">
            <button
              onClick={() => setAspectRatio('16:9')}
              className={`p-2 rounded-md transition-colors ${
                aspectRatio === '16:9'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
              aria-label="Set aspect ratio to 16:9"
            >
              <YouTubeRatioIcon className="w-7 h-auto" />
            </button>
            <button
              onClick={() => setAspectRatio('9:16')}
              className={`p-2 rounded-md transition-colors ${
                aspectRatio === '9:16'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
              aria-label="Set aspect ratio to 9:16"
            >
              <TikTokRatioIcon className="w-auto h-7" />
            </button>
          </div>
        </div>
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          {!isGeneratingAll ? (
            <button
              onClick={handleGenerateAll}
              disabled={isGlobalOperationRunning}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              <SparklesIcon className="w-6 h-6" />
              <span>Generate All Images</span>
            </button>
          ) : (
            <button
              onClick={handleStopGeneration}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
            >
              <StopIcon className="w-6 h-6" />
              <span>Stop Generation</span>
            </button>
          )}
        </div>
        <VideoGrid
          scenes={scenes}
          generatedImages={generatedImages}
          generatingSceneIds={generatingSceneIds}
          isGlobalOperationRunning={isGlobalOperationRunning}
          aspectRatio={aspectRatio}
          onGenerateImage={handleGenerateImage}
          onUpdateScenePrompt={handleUpdateScenePrompt}
        />
      </main>
    </div>
  );
};