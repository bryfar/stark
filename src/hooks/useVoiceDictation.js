import { useState, useRef, useEffect, useCallback } from "react";

// Estados del dictado: idle → recording → transcribing → idle
// La transcripción corre 100% local via voxtype (`voice_transcribe`).

const MAX_SECONDS_DEFAULT = 120;

export function useVoiceDictation({
  onText,
  maxSeconds = MAX_SECONDS_DEFAULT,
} = {}) {
  const [status, setStatus] = useState("idle"); // idle | recording | transcribing | error
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0); // 0..1 para las barras de la burbuja
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);
  const lastLevelUpdateRef = useRef(0);
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const cleanupAudioGraph = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      audioCtxRef.current = null;
      try {
        ctx.close();
      } catch (e) {
        /* ya cerrado */
      }
    }
    setLevel(0);
  }, []);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const teardown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    cleanupAudioGraph();
    recorderRef.current = null;
    chunksRef.current = [];
    releaseStream();
    setElapsed(0);
  }, [cleanupAudioGraph, releaseStream]);

  // Muestrea el volumen del micrófono (~10 fps) para animar la burbuja.
  const startLevelMetering = useCallback((stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const sample = (ts) => {
        if (!audioCtxRef.current) return;
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        if (ts - lastLevelUpdateRef.current > 100) {
          lastLevelUpdateRef.current = ts;
          setLevel(Math.min(1, sum / data.length / 110));
        }
        rafRef.current = requestAnimationFrame(sample);
      };
      rafRef.current = requestAnimationFrame(sample);
    } catch (e) {
      // Sin medidor la burbuja sigue funcionando (barras estáticas).
    }
  }, []);

  const transcribeBlob = useCallback(async (blob) => {
    setStatus("transcribing");
    const reader = new FileReader();
    const base64 = await new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () =>
        reject(new Error("No se pudo leer el audio grabado"));
      reader.readAsDataURL(blob);
    });
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke("voice_transcribe", { audioBase64: base64 });
  }, []);

  const start = useCallback(async () => {
    if (
      statusRef.current === "recording" ||
      statusRef.current === "transcribing"
    )
      return;
    setError(null);
    setPermissionDenied(false);

    // Diagnóstico visible en el log de tauri dev.
    console.log(
      "[voice] click - mediaDevices:",
      !!navigator.mediaDevices,
      "| MediaRecorder:",
      typeof window.MediaRecorder !== "undefined"
    );

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("error");
      setError(
        "Este webview no expone getUserMedia; la captura de microfono no esta disponible."
      );
      return;
    }
    if (typeof window.MediaRecorder === "undefined") {
      setStatus("error");
      setError(
        "Este webview no soporta MediaRecorder; no se puede grabar audio desde el navegador."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log(
        "[voice] getUserMedia ok, tracks:",
        stream.getAudioTracks().length
      );
      streamRef.current = stream;
      chunksRef.current = [];

      let recorder;
      try {
        recorder = new MediaRecorder(stream);
      } catch (mrErr) {
        releaseStream();
        setStatus("error");
        setError(
          "MediaRecorder rechazo el stream: " + String(mrErr.message || mrErr)
        );
        return;
      }
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0)
          chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        teardown();
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        chunksRef.current = [];
        if (blob.size === 0) {
          setStatus("error");
          setError(
            "No se capturo audio. Revisa que el microfono correcto este activo."
          );
          return;
        }
        try {
          const text = await transcribeBlob(blob);
          if (text && text.trim()) {
            onText && onText(text.trim());
            setStatus("idle");
          } else {
            setStatus("error");
            setError("Voxtype no devolvió texto. Vuelve a intentarlo.");
          }
        } catch (e) {
          setStatus("error");
          setError(String(e.message || e));
        }
      };

      recorder.start(250);
      setStatus("recording");
      console.log("[voice] grabando...");
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= maxSeconds) {
            // Auto-stop: inserta lo dicho hasta ahora.
            if (
              recorderRef.current &&
              recorderRef.current.state !== "inactive"
            ) {
              recorderRef.current.stop();
            }
          }
          return next;
        });
      }, 1000);
      startLevelMetering(stream);
    } catch (err) {
      teardown();
      const denied =
        err && (err.name === "NotAllowedError" || err.name === "SecurityError");
      console.log(
        "[voice] fallo en start:",
        err && err.name,
        err && err.message,
        "| denied:",
        denied
      );
      if (denied) {
        // El webview negó el permiso sin diálogo: abrimos el modal con salidas reales.
        setStatus("idle");
        setPermissionDenied(true);
        return;
      }
      setStatus("error");
      setError(
        "No se pudo acceder al microfono: " + String(err.message || err)
      );
    }
  }, [maxSeconds, onText, startLevelMetering, teardown, transcribeBlob]);

  // Ruta alternativa: graba por el sistema (parecord/ffmpeg via Rust), sin
  // permisos del webview, y transcribe con voxtype. Fija de grabación fija.
  const startSystemRecording = useCallback(async () => {
    setPermissionDenied(false);
    setError(null);
    setStatus("transcribing");
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const base64 = await invoke("voice_record", { seconds: 10 });
      const text = await invoke("voice_transcribe", { audioBase64: base64 });
      if (text && text.trim()) {
        onText && onText(text.trim());
        setStatus("idle");
      } else {
        setStatus("error");
        setError("voxtype no devolvio texto para la grabacion.");
      }
    } catch (e) {
      setStatus("error");
      setError(String(e.message || e));
    }
  }, [onText]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const cancel = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = null; // descarta lo grabado
      recorderRef.current.stop();
    }
    teardown();
    setStatus("idle");
  }, [teardown]);

  const dismissError = useCallback(() => {
    setError(null);
    setPermissionDenied(false);
    setStatus((prev) => (prev === "error" ? "idle" : prev));
  }, []);

  // Limpieza al desmontar.
  useEffect(
    () => () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      teardown();
    },
    [teardown]
  );

  return {
    status,
    elapsed,
    level,
    error,
    permissionDenied,
    start,
    stop,
    cancel,
    dismissError,
    startSystemRecording,
  };
}
