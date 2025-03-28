
import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader, ZoomIn, ZoomOut, Check, ArrowLeft } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { AspectRatio } from "@/components/ui/aspect-ratio";

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
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);
  
  // Exakt förhållande för cover image: 3:1 (baserat på ProfileHeader-komponenten)
  const aspectRatio = 3; // width:height ratio
  
  // Load the image when file changes
  useEffect(() => {
    if (imageFile && isOpen) {
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string);
        setIsLoading(false);
        // Reset position and scale
        setPosition({ x: 0, y: 0 });
        setScale(1);
      };
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile, isOpen]);
  
  // Handle mouse/touch events for dragging
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
    
    // Calculate boundaries
    const containerRect = containerRef.current.getBoundingClientRect();
    const imageRect = imageRef.current.getBoundingClientRect();
    
    const scaledWidth = imageRect.width * scale;
    const scaledHeight = imageRect.height * scale;
    
    const minX = containerRect.width - scaledWidth;
    const minY = containerRect.height - scaledHeight;
    
    // Clamp position
    const clampedX = Math.min(0, Math.max(minX, newX));
    const clampedY = Math.min(0, Math.max(minY, newY));
    
    setPosition({ x: clampedX, y: clampedY });
    
    e.preventDefault();
  }, [isDragging, dragStart, scale]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  useEffect(() => {
    // Add global mouse event listeners
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  const handleSave = async () => {
    if (!containerRef.current || !imageRef.current || !imageSrc || !cropBoxRef.current) {
      toast({
        title: "Error",
        description: "Could not process the image. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Create a canvas with the desired output size - exakt dimensioner för header image
      // Leverera en bild med 1500x500px (3:1 ratio) för bästa kvalitet
      const canvas = document.createElement('canvas');
      canvas.width = 1500;  // Header width
      canvas.height = 500;  // Header height
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Get dimensions
      const cropBoxRect = cropBoxRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      const imageRect = imageRef.current.getBoundingClientRect();
      
      // Calculate the source coordinates for cropping
      // Convert the crop box coordinates to be relative to the image
      const sourceX = (cropBoxRect.left - containerRect.left - position.x) / scale;
      const sourceY = (cropBoxRect.top - containerRect.top - position.y) / scale;
      const sourceWidth = cropBoxRect.width / scale;
      const sourceHeight = cropBoxRect.height / scale;
      
      // Draw the image to the canvas
      ctx.drawImage(
        imageRef.current,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        1500,
        500
      );
      
      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onSave(blob);
            toast({
              title: "Success",
              description: "Cover image processed successfully",
            });
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
        0.9  // Högre kvalitet
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
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-2 h-8 w-8" 
              onClick={onClose}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>Redigera coverbild</DialogTitle>
          </div>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader className="h-8 w-8 animate-spin text-twitter-blue" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visuell förhandsvisning som exakt matchar profilheaderns dimensioner */}
            <div className="relative overflow-hidden">
              {/* AspectRatio garaneterar att vi visar exakt samma förhållande som headern */}
              <AspectRatio ratio={3/1} className="bg-black w-full">
                <div 
                  ref={containerRef}
                  className="relative overflow-hidden w-full h-full bg-black cursor-move flex items-center justify-center"
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
                  
                  {/* Crop box med guidelines - tar hela tillgängliga ytan för att matcha headerproportionerna */}
                  <div 
                    ref={cropBoxRef}
                    className="absolute inset-0 pointer-events-none border-2 border-blue-500"
                    style={{
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                    }}
                  >
                    {/* Grid lines för visuell guidning - 3x3 grid */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                      <div className="border-r border-blue-500 opacity-70 h-full"></div>
                      <div className="border-r border-blue-500 opacity-70 h-full"></div>
                      <div className="border-b border-blue-500 opacity-70 w-full"></div>
                      <div className="border-b border-blue-500 opacity-70 w-full"></div>
                    </div>
                    
                    {/* Information text */}
                    <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                      Rekommenderad storlek: 1500 × 500px
                    </div>
                  </div>
                </div>
              </AspectRatio>
            </div>
            
            <div className="flex items-center space-x-2 p-4 w-full bg-gray-100">
              <ZoomOut className="h-4 w-4 text-gray-700" />
              <Slider
                value={[scale]}
                min={1}
                max={3}
                step={0.01}
                onValueChange={(values) => setScale(values[0])}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-gray-700" />
            </div>
            
            <div className="p-4 flex justify-end">
              <Button 
                onClick={handleSave} 
                variant="default" 
                disabled={isProcessing} 
                className="rounded-full font-medium px-6"
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CoverImageCropper;
