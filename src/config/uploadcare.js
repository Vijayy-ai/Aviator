// Uploadcare Configuration Constants
const UPLOADCARE_PUBLIC_KEY = "18906b1428767eaf6052";
const UPLOADCARE_UPLOAD_URL = "https://upload.uploadcare.com/base/";

export const UPLOADCARE_CONFIG = {
  publicKey: UPLOADCARE_PUBLIC_KEY,
  uploadUrl: UPLOADCARE_UPLOAD_URL,
  storeAuto: "auto",
  // Note: Image sizing is handled by the image picker (square aspect ratio)
  // Uploadcare serves the original uploaded image without transformations
  imageProcessing: {
    size: "1024x1024", // Target size (handled by image picker)
    format: "jpeg",
    quality: "80"
  }
};

/**
 * Upload an image to Uploadcare
 * @param {string} imageUri - The local URI of the image to upload
 * @returns {Promise<string>} - The Uploadcare CDN URL of the uploaded image
 */
export const uploadToUploadcare = async (imageUri) => {
  console.log('🚀 Starting Uploadcare upload for:', imageUri);
  
  try {
    console.log('📋 Using Uploadcare configuration:');
    console.log('   - Public Key:', UPLOADCARE_CONFIG.publicKey);
    console.log('   - Upload URL:', UPLOADCARE_CONFIG.uploadUrl);
    console.log('   - Store Auto:', UPLOADCARE_CONFIG.storeAuto);
    console.log('   - Image Size:', UPLOADCARE_CONFIG.imageProcessing.size);
    
    const formData = new FormData();
    
    // Add file with proper structure for React Native
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'game-image.jpg'
    });
    
    // Add Uploadcare required parameters
    formData.append('UPLOADCARE_PUB_KEY', UPLOADCARE_CONFIG.publicKey);
    formData.append('UPLOADCARE_STORE', UPLOADCARE_CONFIG.storeAuto);

    console.log('📤 Sending request to Uploadcare...');
    const response = await fetch(UPLOADCARE_CONFIG.uploadUrl, {
      method: 'POST',
      body: formData,
    });

    console.log('📡 Uploadcare response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP Error:', response.status, errorText);
      throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('📡 Uploadcare response data:', data);

    if (data.file) {
      // Use simple URL without transformations - Uploadcare will serve the original image
      const imageUrl = `https://ucarecdn.com/${data.file}/`;
      console.log('✅ Upload successful!');
      console.log('🔗 Image URL:', imageUrl);
      return imageUrl;
    } else {
      console.error('❌ Uploadcare upload failed:', data);
      
      // Check for specific error types
      if (data.error) {
        const errorMessage = data.error.content || data.error;
        console.error('❌ Error details:', errorMessage);
        
        if (errorMessage.includes('Invalid public key')) {
          console.error('🔧 SOLUTION: Check that your Uploadcare public key is correct');
          throw new Error('Invalid public key. Please check your Uploadcare settings.');
        }
      }
      
      throw new Error('Upload failed: ' + JSON.stringify(data));
    }
  } catch (error) {
    console.error('💥 Error uploading to Uploadcare:', error);
    throw error;
  }
};
