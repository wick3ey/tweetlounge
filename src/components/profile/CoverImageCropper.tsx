
import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader, ZoomIn, ZoomOut, Check } from "lucide-react";

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
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
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
      window.addEventListener('mousemove', handleMouseMove as any);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove as any);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  const handleSave = async () => {
    if (!containerRef.current || !imageRef.current || !imageSrc) return;
    
    setIsProcessing(true);
    
    try {
      // Create a canvas with the desired output size
      const canvas = document.createElement('canvas');
      canvas.width = 1500;
      canvas.height = 500;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Calculate the area to crop
      const containerRect = containerRef.current.getBoundingClientRect();
      const imageRect = imageRef.current.getBoundingClientRect();
      
      const scaleRatio = 1500 / containerRect.width;
      
      // Draw the image to the canvas with the adjusted position and scale
      ctx.drawImage(
        imageRef.current,
        -position.x / scale,
        -position.y / scale,
        imageRect.width / scale,
        imageRect.height / scale,
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
          }
          setIsProcessing(false);
          onClose();
        },
        'image/jpeg',
        0.8
      );
    } catch (error) {
      console.error('Error processing image:', error);
      setIsProcessing(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Adjust Cover Photo</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader className="h-8 w-8 animate-spin text-twitter-blue" />
          </div>
        ) : (
          <div className="space-y-4">
            <div 
              ref={containerRef}
              className="relative overflow-hidden w-full h-64 bg-gray-100 rounded-lg cursor-move"
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
            </div>
            
            <div className="flex items-center space-x-2">
              <ZoomOut className="h-4 w-4" />
              <Slider
                value={[scale]}
                min={1}
                max={2}
                step={0.01}
                onValueChange={(values) => setScale(values[0])}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4" />
            </div>
            
            <div className="text-xs text-gray-500 text-center">
              Drag to position and use the slider to zoom
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" /> Processing
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Apply
                  </>
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
