import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, Download, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProofImageModalProps {
  imageUrl: string;
  title: string;
  description?: string;
  trigger?: React.ReactNode;
  type?: "admin" | "client";
}

const ProofImageModal = ({ 
  imageUrl, 
  title, 
  description, 
  trigger,
  type = "admin" 
}: ProofImageModalProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [open, setOpen] = useState(false);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleDownload = () => {
    // Create a temporary link to download the image
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${title.replace(/\s+/g, '_').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const defaultTrigger = (
    <Button
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <Eye className="w-4 h-4" />
      {type === "admin" ? "View Admin Proof" : "View Client Proof"}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full h-[90vh] p-0" hideClose={false}>
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  type === "admin" 
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/20" 
                    : "bg-green-500/10 text-green-600 border-green-500/20"
                )}
              >
                {type === "admin" ? "Admin Proof" : "Client Proof"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsZoomed(!isZoomed)}
                disabled={isLoading}
              >
                {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={isLoading}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-2">{description}</p>
          )}
        </DialogHeader>
        
        <div className="flex-1 p-6 overflow-auto">
          <div className="flex items-center justify-center h-full">
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Loading image...</span>
              </div>
            )}
            <img
              src={imageUrl}
              alt={title}
              onLoad={handleImageLoad}
              className={cn(
                "max-w-full h-auto rounded-lg shadow-lg transition-all duration-300",
                isLoading && "opacity-0",
                !isLoading && "opacity-100",
                isZoomed ? "cursor-zoom-out scale-150" : "cursor-zoom-in hover:scale-105"
              )}
              onClick={() => setIsZoomed(!isZoomed)}
            />
          </div>
        </div>

        {!isLoading && (
          <div className="px-6 py-4 border-t bg-muted/20">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Click image to {isZoomed ? "zoom out" : "zoom in"}</span>
              <span>Right-click to save image</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProofImageModal;