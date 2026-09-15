import { useState, useEffect, useRef } from 'react';
import { Camera, Scan, CheckCircle2, AlertTriangle, Loader2, Monitor } from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';

interface FaceVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (descriptor: number[], photoDataUrl: string) => void;
  actionType: 'checkin' | 'checkout';
  preventCancel?: boolean;
  registeredDescriptor?: number[];
  disableBiometric?: boolean;
}

export function FaceVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  actionType,
  preventCancel,
  registeredDescriptor,
  disableBiometric
}: FaceVerificationModalProps) {
  const [step, setStep] = useState<0 | 1 | 2>(0); // 0: Init/Loading, 1: Scanning, 2: Success
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing camera...');
  const [error, setError] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (disableBiometric) {
      onSuccess([], '');
      return;
    }

    // Reset state
    setStep(0);
    setProgress(0);
    setLoadingMessage('Loading facial biometric models...');
    setError('');
    setFaceDetected(false);

    // Load models and start camera
    const initBiometrics = async () => {
      try {
        setLoadingMessage('Loading facial biometric models...');
        
        // Load models from local folder if not already loaded in the faceapi global namespace
        if (!faceapi.nets.tinyFaceDetector.isLoaded) {
          const modelUrl = '/models';
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
            faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
            faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
          ]);
        }
        
        setLoadingMessage('Starting camera sensor...');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported on this device or desktop.');
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 480, height: 480 },
          audio: false
        });
        
        setStream(mediaStream);
        setError('');
        setLoadingMessage('');
        setStep(1);
      } catch (err: any) {
        console.error('Biometric Init Error:', err);
        setError('No webcam detected or camera permission denied. Desktop users can click below to continue.');
      }
    };

    initBiometrics();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Assign stream to video element when stream and videoRef are available
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.error('Video play error:', err);
      });
    }
  }, [stream, step]);

  // Face Detection & Verification Processing Loop
  useEffect(() => {
    if (step !== 1 || !stream || !videoRef.current) return;

    let active = true;
    let detectionInterval: ReturnType<typeof setInterval>;

    detectionInterval = setInterval(async () => {
      if (!active || !videoRef.current) return;

      try {
        // Run face detection on the current webcam video frame
        const detection = await faceapi.detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 })
        ).withFaceLandmarks().withFaceDescriptor();

        if (detection) {
          setFaceDetected(true);
          const liveDescriptor = Array.from(detection.descriptor) as number[];

          setProgress(prev => {
            const nextProgress = prev + 50; // Verifies in 2 frames (0.4s) instead of 10
            if (nextProgress >= 100) {
              clearInterval(detectionInterval);
              active = false;
              handleVerificationSuccess(liveDescriptor);
              return 100;
            }
            return nextProgress;
          });
        } else {
          setFaceDetected(false);
          // Decay progress slowly if face is lost to encourage stable alignment
          setProgress(prev => Math.max(0, prev - 2));
        }
      } catch (err) {
        console.error('Face detection run error:', err);
      }
    }, 200); // Check frame every 200ms

    return () => {
      active = false;
      clearInterval(detectionInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, stream]);

  const handleVerificationSuccess = (liveDescriptor: number[]) => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth || 480;
        canvas.height = video.videoHeight || 480;
        
        // Draw mirror-flipped snapshot
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        context.setTransform(1, 0, 0, 1, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg');

        // If a descriptor exists, perform a real matching distance check
        if (registeredDescriptor && registeredDescriptor.length > 0) {
          const distance = faceapi.euclideanDistance(liveDescriptor, registeredDescriptor);
          console.log('Biometric Verification Distance:', distance);

          // Standard Euclidean distance threshold for matching is < 0.6
          if (distance > 0.62) {
            setError('Biometric Mismatch: Face does not match registered employee profile!');
            setStep(0); // Reset to allow retry
            setProgress(0);
            
            // Stop and restart stream for user retry
            if (stream) stream.getTracks().forEach(track => track.stop());
            
            setTimeout(() => {
              navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 480, height: 480 },
                audio: false
              }).then(newStream => {
                setStream(newStream);
                if (videoRef.current) {
                  videoRef.current.srcObject = newStream;
                  videoRef.current.play();
                }
                setError('');
                setStep(1);
              }).catch(() => {
                setError('Failed to restart camera sensor.');
              });
            }, 3000);
            return;
          }
        }

        // Match success
        setStep(2);
        
        setTimeout(() => {
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          onSuccess(liveDescriptor, dataUrl);
        }, 1200);
      }
    }
  };

  if (!isOpen) return null;

  const isRegistering = !registeredDescriptor || registeredDescriptor.length === 0;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col p-6 items-center text-center">
        
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-slate-800 font-extrabold text-lg flex items-center justify-center gap-2">
            <Scan className="w-5 h-5 text-green-600 animate-pulse" />
            Biometric Face Attendance
          </h3>
          <p className="text-slate-400 text-xs mt-0.5 uppercase tracking-wider font-bold">
            {isRegistering ? (
              <span className="text-violet-600">First-Time Registration</span>
            ) : (
              actionType === 'checkin' ? 'Sign-In Verification' : 'Sign-Out Verification'
            )}
          </p>
        </div>

        {/* Camera Scanner Viewport */}
        <div className={`relative w-64 h-64 rounded-full overflow-hidden border-4 transition-all duration-350 ${
          faceDetected ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.35)]' : 'border-slate-100'
        } bg-slate-950 flex items-center justify-center shadow-inner group`}>
          {error ? (
            <div className="px-6 text-amber-400 space-y-2 text-center">
              <Monitor className="w-10 h-10 mx-auto text-amber-400 opacity-90" />
              <p className="text-xs font-semibold leading-relaxed text-amber-200">Camera Unavailable</p>
              <p className="text-[10px] text-slate-300">Desktop / No-Webcam Mode</p>
            </div>
          ) : step === 0 ? (
            <div className="px-6 text-slate-300 space-y-2 text-center">
              <Loader2 className="w-8 h-8 mx-auto text-green-500 animate-spin" />
              <p className="text-xs font-semibold leading-relaxed text-slate-300">{loadingMessage || 'Initializing...'}</p>
            </div>
          ) : (
            <>
              {/* Webcam Video */}
              <video
                ref={videoRef}
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Scanning Target Overlays */}
              {step === 1 && (
                <>
                  {/* Glowing Laser Sweep Line */}
                  <div className={`absolute left-0 right-0 h-0.5 ${
                    faceDetected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-amber-500 shadow-[0_0_10px_#f59e0b]'
                  } transition-colors duration-300 animate-[bounce_2.5s_infinite]`} />
                  
                  {/* High-Tech Circular HUD overlay */}
                  <div className={`absolute inset-0 pointer-events-none transition-all duration-300 ${
                    faceDetected ? 'border-green-500/40' : 'border-amber-500/30'
                  } rounded-full border-2 border-dashed`}>
                    {/* Glowing corners / brackets for alignment guidance */}
                    <div className="absolute inset-8 border border-white/10 rounded-full">
                      {/* Retro Scanner Target Overlay Grid */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-10">
                        <div className="w-px h-full bg-white border-dashed" />
                        <div className="h-px w-full bg-white border-dashed" />
                      </div>
                      {/* Scanner Circular Target Rings */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 border border-dashed border-white/20 rounded-full animate-[ping_4s_infinite]" />
                    </div>
                  </div>
                </>
              )}

              {/* Success Overlay */}
              {step === 2 && (
                <div className="absolute inset-0 bg-green-600/10 flex items-center justify-center backdrop-blur-[1px]">
                  <CheckCircle2 className="w-16 h-16 text-green-500 bg-white rounded-full shadow-[0_0_20px_rgba(34,197,94,0.4)] animate-in zoom-in-50 duration-300" />
                </div>
              )}
            </>
          )}

          {/* Canvas for image capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Status / Instructions */}
        <div className="mt-6 w-full space-y-4">
          {error ? (
            <div className="space-y-3">
              <div className="text-amber-800 text-xs font-medium p-3 bg-amber-50 border border-amber-200 rounded-xl leading-relaxed">
                {error}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (stream) stream.getTracks().forEach(track => track.stop());
                  onSuccess([], '');
                }}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Continue in Desktop Mode (Skip Biometric)
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {step === 0 && (
                <div className="flex items-center justify-center gap-2 text-slate-500 text-sm font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                  <span>{loadingMessage || 'Initializing camera sensor...'}</span>
                </div>
              )}
              {step === 1 && (
                <div className="space-y-3">
                  <div className="flex justify-center mb-1">
                    {faceDetected ? (
                      <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold tracking-wider uppercase rounded-full flex items-center gap-1.5 shadow-sm animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                        Biometrics Sensed
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold tracking-wider uppercase rounded-full flex items-center gap-1.5 shadow-sm animate-bounce">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Align Face In Center
                      </span>
                    )}
                  </div>
                  <p className="text-slate-700 text-sm font-semibold">
                    {isRegistering ? 'Registering face print. Keep face still...' : 'Scanning biometric features. Keep face still...'}
                  </p>
                  {/* Custom Progress Bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                    <div
                      className={`h-full bg-gradient-to-r ${
                        faceDetected ? 'from-green-500 to-emerald-600' : 'from-amber-400 to-amber-500'
                      } transition-all duration-100 ease-out`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                    Verification {progress}%
                  </span>
                </div>
              )}
              {step === 2 && (
                <p className="text-green-600 text-sm font-bold flex items-center justify-center gap-1">
                  Biometric ID Verified Successfully!
                </p>
              )}
            </div>
          )}

          {/* Footer controls */}
          <div className="flex gap-2.5 pt-2 justify-center flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (stream) stream.getTracks().forEach(track => track.stop());
                onClose();
              }}
              className="px-5 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-xl text-sm font-medium transition-colors"
            >
              {preventCancel ? 'Sign Out' : 'Cancel'}
            </button>

            {/* Desktop / No Camera Bypass button */}
            <button
              type="button"
              onClick={() => {
                if (stream) stream.getTracks().forEach(track => track.stop());
                onSuccess([], '');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
              title="Click here if working on a desktop computer without a webcam"
            >
              <Monitor className="w-3.5 h-3.5 text-slate-500" />
              Desktop (No Camera)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
