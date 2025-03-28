
import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader, ZoomIn, ZoomOut, ArrowLeft } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";

interface CoverImageCropperProps {
  imageFile: File | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (croppedImage: Blob) => void;
}

const CoverImageCropper = ({
  imageFile,
  isOpen,
  onClose,
  onSave,
}: CoverImageCropperProps) => {
  const { user } = useAuth();
  const { updateProfile } = useProfile();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [naturalImageSize, setNaturalImageSize] = useState({ width: 0, height: 0 });
  
  // Twitter header dimensions (3:1 ratio)
  const targetWidth = 1500;
  const targetHeight = 500;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Load the image when file changes
  useEffect(() => {
    if (imageFile && isOpen) {
      setIsLoading(true);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImageSrc(result);
        
        // Get natural dimensions
        const img = new Image();
        img.onload = () => {
          setNaturalImageSize({
            width: img.naturalWidth,
            height: img.naturalHeight
          });
          
          // Center image in container
          setTimeout(() => {
            if (containerRef.current) {
              const containerRect = containerRef.current.getBoundingClientRect();
              
              // Always start with scale 1 (original size)
              setScale(1);
              
              // Center the image
              const centerX = (containerRect.width - img.naturalWidth) / 2;
              const centerY = (containerRect.height - img.naturalHeight) / 2;
              
              setPosition({
                x: centerX,
                y: centerY
              });
            }
            setIsLoading(false);
          }, 100);
        };
        img.src = result;
      };
      
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile, isOpen]);
  
  // Handle mouse events for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    
    e.preventDefault();
  }, [position]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current || !imageRef.current) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    setPosition({ x: newX, y: newY });
    e.preventDefault();
  }, [isDragging, dragStart]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  // Handle zoom with slider
  const handleZoomChange = (newScale: number[]) => {
    const zoomValue = newScale[0];
    setScale(zoomValue);
  };
  
  // Crop and save the image
  const handleSave = async () => {
    if (!containerRef.current || !imageRef.current || !imageSrc || !user?.id) {
      toast({
        title: "Error",
        description: "Could not process the image. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Create a canvas with Twitter header dimensions
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Get dimensions and positions
      const containerRect = containerRef.current.getBoundingClientRect();
      
      // Calculate the visible area of the image (the crop area)
      const cropRect = {
        left: -position.x, // Convert container-relative to image-relative
        top: -position.y,
        width: containerRect.width,
        height: containerRect.height
      };
      
      // Calculate source and destination coordinates
      const sourceX = cropRect.left / scale;
      const sourceY = cropRect.top / scale;
      const sourceWidth = cropRect.width / scale;
      const sourceHeight = cropRect.height / scale;
      
      // Draw the image to the canvas with the Twitter dimensions
      ctx.drawImage(
        imageRef.current,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        targetWidth,
        targetHeight
      );
      
      // Convert canvas to blob with high quality
      canvas.toBlob(
        async (blob) => {
          if (blob) {
            // Call the onSave callback with the cropped image blob
            onSave(blob);
            
            try {
              // Generate a unique filename
              const fileExt = "jpeg";
              const filePath = `${user.id}/cover.${fileExt}`;
              
              // Upload the file to Supabase Storage
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars') // Using the avatars bucket for cover images too
                .upload(filePath, blob, { 
                  upsert: true,
                  contentType: 'image/jpeg' 
                });
              
              if (uploadError) {
                throw uploadError;
              }
              
              // Get the public URL
              const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);
              
              // Update the profile with the new cover URL
              await updateProfile({ 
                cover_url: urlData.publicUrl
              });
              
              toast({
                title: "Success",
                description: "Cover image updated successfully",
              });
            } catch (error) {
              console.error('Error uploading cover image:', error);
              toast({
                title: "Error uploading to storage",
                description: error.message,
                variant: "destructive",
              });
            }
          } else {
            toast({
              title: "Error",
              description: "Failed to process image. Please try again.",
              variant: "destructive",
            });
          }
          setIsProcessing(false);
          onClose();
        },
        'image/jpeg',
        0.95  // High quality
      );
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Error",
        description: "An error occurred while processing the image.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-0">
        <DialogHeader className="p-4 border-b border-gray-700 bg-black">
          <div className="flex items-center justify-between w-full">
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-2 h-8 w-8 text-white hover:bg-gray-800" 
              onClick={onClose}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-white text-center flex-grow">Redigera coverbild</DialogTitle>
            <Button 
              onClick={handleSave} 
              variant="outline" 
              size="sm"
              disabled={isProcessing} 
              className="rounded-full font-medium px-4 bg-white text-black hover:bg-gray-200 border-0"
            >
              {isProcessing ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" /> Bearbetar
                </>
              ) : (
                "Använd"
              )}
            </Button>
          </div>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64 bg-black">
            <Loader className="h-8 w-8 animate-spin text-white" />
          </div>
        ) : (
          <div className="space-y-4 bg-black">
            {/* Twitter-style aspect ratio cropper with exact 3:1 ratio */}
            <div className="relative overflow-hidden">
              <AspectRatio ratio={3/1} className="bg-black w-full">
                <div 
                  ref={containerRef}
                  className="relative overflow-hidden w-full h-full bg-black cursor-move"
                  onMouseDown={handleMouseDown}
                  style={{ touchAction: 'none' }}
                >
                  {imageSrc && (
                    <img
                      ref={imageRef}
                      src={imageSrc}
                      alt="Cover image preview"
                      className="absolute transform-gpu"
                      style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transformOrigin: '0 0',
                        maxWidth: 'none',
                      }}
                      draggable={false}
                    />
                  )}
                  
                  {/* Twitter-style crop guide with 3:1 ratio */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Blue grid lines for guidance */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                      <div className="border-r border-blue-500 opacity-50 h-full"></div>
                      <div className="border-r border-blue-500 opacity-50 h-full"></div>
                      <div className="border-b border-blue-500 opacity-50 w-full"></div>
                      <div className="border-b border-blue-500 opacity-50 w-full"></div>
                    </div>
                    
                    {/* Crop border */}
                    <div className="absolute inset-0 border-2 border-blue-500"></div>
                    
                    {/* Corner handles */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-2 border-blue-500 bg-black rounded-sm"></div>
                    <div className="absolute top-0 right-0 w-3 h-3 border-2 border-blue-500 bg-black rounded-sm"></div>
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-2 border-blue-500 bg-black rounded-sm"></div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-2 border-blue-500 bg-black rounded-sm"></div>
                    
                    {/* Size information */}
                    <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                      1500 × 500px
                    </div>
                  </div>
                </div>
              </AspectRatio>
            </div>
            
            {/* Zoom slider */}
            <div className="flex items-center space-x-2 p-6 bg-black text-white">
              <ZoomOut className="h-5 w-5 text-white" />
              <Slider
                value={[scale]}
                min={0.5}
                max={2}
                step={0.01}
                onValueChange={handleZoomChange}
                className="flex-1"
              />
              <ZoomIn className="h-5 w-5 text-white" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CoverImageCropper;
