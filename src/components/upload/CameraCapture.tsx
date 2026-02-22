import { useRef, useState, useCallback, useEffect } from "react";
import { X, Camera, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

const CameraCapture = ({ onCapture, onCancel }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isLandscape, setIsLandscape] = useState(() => window.innerWidth > window.innerHeight);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 2560 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch {
      onCancel();
    }
  }, [onCancel]);

  useEffect(() => {
    startCamera();
    const handleResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCaptured(dataUrl);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const handleRetake = () => {
    setCaptured(null);
    setCameraReady(false);
    startCamera();
  };

  const handleConfirm = () => {
    if (!captured) return;
    fetch(captured)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], `multa-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
      });
  };

  const cutout = isLandscape
    ? { x: "8%", y: "18%", width: "84%", height: "60%" }
    : { x: "17.5%", y: "4%", width: "65%", height: "92%" };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <canvas ref={canvasRef} className="hidden" />

      {/* Preview after capture */}
      {captured ? (
        <>
          <div className="flex-1 flex items-center justify-center p-4">
            <img
              src={captured}
              alt="Foto capturada"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
          <div className="p-6 flex gap-3 justify-center bg-black/80 backdrop-blur-sm">
            <Button
              variant="outline"
              onClick={handleRetake}
              className="flex-1 max-w-[200px] h-12 border-white/20 text-white hover:bg-white/10"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Tirar novamente
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 max-w-[200px] h-12 btn-premium"
            >
              <Camera className="h-5 w-5 mr-2" />
              Usar esta foto
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Camera view with overlay */}
          <div className="relative flex-1 overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Darkened overlay with transparent A4 cutout */}
            {cameraReady && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Top text */}
                <div className="absolute top-0 left-0 right-0 z-10 p-6 pt-12 text-center">
                  <p className="text-white text-base font-medium drop-shadow-lg bg-black/40 backdrop-blur-sm rounded-full px-4 py-2 inline-block">
                    Posicione a multa dentro da área destacada
                  </p>
                </div>

                {/* SVG overlay with cutout */}
                <svg className="absolute inset-0 w-full h-full">
                  <defs>
                    <mask id="cutout">
                      <rect width="100%" height="100%" fill="white" />
                      <rect
                        x={cutout.x}
                        y={cutout.y}
                        width={cutout.width}
                        height={cutout.height}
                        rx="12"
                        fill="black"
                      />
                    </mask>
                  </defs>
                  <rect
                    width="100%"
                    height="100%"
                    fill="rgba(0,0,0,0.6)"
                    mask="url(#cutout)"
                  />
                  {/* Border around cutout */}
                  <rect
                    x={cutout.x}
                    y={cutout.y}
                    width={cutout.width}
                    height={cutout.height}
                    rx="12"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeDasharray="0"
                    opacity="0.8"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Bottom controls */}
          <div className="p-6 flex items-center justify-center gap-6 bg-black/80 backdrop-blur-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="h-12 w-12 rounded-full text-white hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </Button>
            <button
              onClick={handleCapture}
              disabled={!cameraReady}
              className="w-[72px] h-[72px] rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-all duration-200 active:scale-90 disabled:opacity-40 flex items-center justify-center"
              aria-label="Capturar foto"
            >
              <div className="w-[56px] h-[56px] rounded-full bg-white" />
            </button>
            <div className="h-12 w-12" /> {/* Spacer for centering */}
          </div>
        </>
      )}
    </div>
  );
};

export default CameraCapture;
