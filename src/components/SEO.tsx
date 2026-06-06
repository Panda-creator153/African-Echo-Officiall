import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  schema?: any;
}

const SEO: React.FC<SEOProps> = ({ 
  title, 
  description, 
  keywords, 
  image, 
  url, 
  type = 'website',
  schema 
}) => {
  const location = useLocation();
  const siteName = 'African Echo';
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const baseUrl = 'https://ais-dev-7ftw2kzntwrxxs3oeacg4z-532681067178.us-west2.run.app';
  const currentUrl = url || `${baseUrl}${location.pathname}`;
  const defaultDesc = 'African Echo is a Ugandan singer and songwriter based in Kampala, Uganda. Experience atmospheric cinematic music, soul-stirring lyrics, and unique East African sonic landscapes.';
  const defaultImage = `${baseUrl}/uploads/1779062374784-224499747.jpg`;
  
  useEffect(() => {
    // Update title
    document.title = fullTitle;
    
    // Update meta tags
    const updateMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
      let element = document.querySelector(`meta[${attr}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    updateMeta('description', description || defaultDesc);
    updateMeta('keywords', keywords || 'African Echo, Ugandan Singer, Songwriter, Kampala Music, East African Music, Electronic Soul, Cinematic Music, Aether, Uganda Artist');
    
    // OG Tags
    updateMeta('og:title', fullTitle, 'property');
    updateMeta('og:description', description || defaultDesc, 'property');
    updateMeta('og:image', image || defaultImage, 'property');
    updateMeta('og:url', currentUrl, 'property');
    updateMeta('og:type', type, 'property');
    
    // Twitter Tags
    updateMeta('twitter:title', fullTitle, 'property');
    updateMeta('twitter:description', description || defaultDesc, 'property');
    updateMeta('twitter:image', image || defaultImage, 'property');
    
    // Schema Markup
    const existingSchema = document.getElementById('json-ld-schema');
    if (existingSchema) {
      existingSchema.remove();
    }
    
    if (schema) {
      const script = document.createElement('script');
      script.id = 'json-ld-schema';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
    }
  }, [fullTitle, description, keywords, image, currentUrl, type, schema, defaultDesc, defaultImage]);

  return null;
};

export default SEO;
