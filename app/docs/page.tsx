'use client';

/**
 * Swagger UI Documentation Page
 * 
 * Displays the API documentation using Swagger UI at /docs
 */

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<object | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSpec() {
      try {
        const response = await fetch('/api/docs');
        if (!response.ok) {
          throw new Error('Failed to fetch API specification');
        }
        const data = await response.json();
        setSpec(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchSpec();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading API Documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Documentation</h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="swagger-wrapper">
      <style jsx global>{`
        /* Custom Swagger UI Styling */
        .swagger-wrapper {
          min-height: 100vh;
          background: #fafafa;
        }
        
        .swagger-ui .topbar {
          background-color: #1e40af;
        }
        
        .swagger-ui .topbar .download-url-wrapper .download-url-button {
          background-color: #3b82f6;
          border-color: #3b82f6;
        }
        
        .swagger-ui .topbar .download-url-wrapper .download-url-button:hover {
          background-color: #2563eb;
          border-color: #2563eb;
        }
        
        .swagger-ui .info .title {
          font-size: 2rem;
        }
        
        .swagger-ui .info .title small {
          background-color: #3b82f6;
        }
        
        .swagger-ui .opblock-tag {
          font-size: 1.2rem;
          font-weight: 600;
        }
        
        .swagger-ui .opblock .opblock-summary-description {
          font-size: 0.9rem;
        }
        
        .swagger-ui .btn.execute {
          background-color: #3b82f6;
          border-color: #3b82f6;
        }
        
        .swagger-ui .btn.execute:hover {
          background-color: #2563eb;
        }
        
        .swagger-ui .responses-inner h4 {
          color: #1e40af;
        }
        
        .swagger-ui .response-col_status {
          font-weight: 600;
        }
        
        /* Hide topbar URL input since we load spec directly */
        .swagger-ui .topbar .download-url-wrapper {
          display: none;
        }
        
        /* Better code blocks */
        .swagger-ui .highlight-code {
          background: #1e293b;
        }
        
        .swagger-ui .microlight {
          color: #e2e8f0;
        }
        
        /* Model styling */
        .swagger-ui .model-box {
          border-color: #e5e7eb;
        }
        
        .swagger-ui .model-title {
          font-weight: 600;
        }
      `}</style>
      
      {spec && (
        <SwaggerUI
          spec={spec}
          docExpansion="list"
          defaultModelsExpandDepth={1}
          defaultModelExpandDepth={1}
          displayOperationId={false}
          displayRequestDuration={true}
          filter={true}
          deepLinking={true}
          tryItOutEnabled={true}
          requestSnippetsEnabled={true}
          persistAuthorization={true}
          syntaxHighlight={{
            activate: true,
            theme: 'monokai'
          }}
        />
      )}
    </div>
  );
}
