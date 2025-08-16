/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import {DocumentArrowUpIcon, SparklesIcon} from './icons';

interface PdfUploadPageProps {
  onPdfUpload: (file: File) => void;
  isProcessing: boolean;
}

/**
 * A page that allows the user to upload a PDF script to generate a storyboard.
 */
export const PdfUploadPage: React.FC<PdfUploadPageProps> = ({
  onPdfUpload,
  isProcessing,
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && !isProcessing) {
      onPdfUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (isProcessing) return;
    const file = event.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      onPdfUpload(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text inline-flex items-center gap-4">
          <SparklesIcon className="w-10 h-10 md:w-12 md:h-12" />
          <span>Storyboard Generator</span>
        </h1>
        <p className="text-gray-400 mt-2 text-lg">
          Upload your script in PDF format to get started.
        </p>
      </div>

      <div className="w-full max-w-2xl">
        <label
          htmlFor="pdf-upload"
          className={`relative block w-full h-64 border-4 border-dashed rounded-lg flex flex-col items-center justify-center text-center p-4 transition-all duration-300 ${
            isProcessing
              ? 'border-gray-700'
              : 'border-gray-600 cursor-pointer hover:border-purple-500 hover:bg-gray-800/50'
          }`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-purple-500 mb-4"></div>
              <h2 className="text-xl font-semibold text-white">
                Analyzing Script...
              </h2>
              <p className="text-gray-400">This may take a moment.</p>
            </div>
          ) : (
            <>
              <DocumentArrowUpIcon className="w-16 h-16 text-gray-500 mb-4" />
              <span className="text-xl font-semibold text-white">
                Drop your PDF here
              </span>
              <span className="text-gray-400 mt-1">or click to browse</span>
              <input
                id="pdf-upload"
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
            </>
          )}
        </label>
      </div>
    </div>
  );
};
