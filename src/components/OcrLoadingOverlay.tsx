import { Settings, Sparkles } from "lucide-react";

const OcrLoadingOverlay = () => {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center space-y-6 animate-fade-in">
        {/* Animated gear icon */}
        <div className="relative w-24 h-24 mx-auto">
          <Settings className="w-24 h-24 text-primary animate-spin" style={{ animationDuration: '3s' }} />
          <Sparkles 
            className="absolute top-0 right-0 w-6 h-6 text-yellow-500 animate-pulse" 
          />
          <Sparkles 
            className="absolute bottom-2 left-0 w-5 h-5 text-yellow-400 animate-pulse" 
            style={{ animationDelay: '0.5s' }}
          />
        </div>
        
        {/* Primary text */}
        <h2 className="text-2xl font-bold text-foreground">
          Analisando documento...
        </h2>
        
        {/* Secondary text */}
        <p className="text-muted-foreground max-w-xs mx-auto">
          A IA está extraindo informações da sua notificação
        </p>
        
        {/* Animated dots */}
        <div className="flex justify-center gap-2">
          <span 
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span 
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span 
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
};

export default OcrLoadingOverlay;