import VoiceBubble from "./VoiceBubble";
import VoicePermissionModal from "./VoicePermissionModal";

// Renderiza la burbuja de dictado (anclada al contenedor relativo del padre)
// y el modal de permisos cuando el webview deniega el microfono.
export function VoiceDictation({ voice }) {
  return (
    <>
      <VoiceBubble
        status={voice.status}
        elapsed={voice.elapsed}
        level={voice.level}
        error={voice.error}
        onStop={voice.stop}
        onCancel={voice.status === "error" ? voice.dismissError : voice.cancel}
      />
      <VoicePermissionModal
        visible={!!voice.permissionDenied}
        reason={voice.error}
        onRetry={() => voice.start()}
        onSystemRecord={() => voice.startSystemRecording()}
        onClose={() => voice.dismissError()}
      />
    </>
  );
}

export default VoiceDictation;
