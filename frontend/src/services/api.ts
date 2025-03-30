export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/upload/image', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Upload failed');
  }
  
  return await response.json();
};