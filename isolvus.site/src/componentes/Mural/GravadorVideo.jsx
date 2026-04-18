import { useState, useEffect, useRef } from 'react';

/* Qualidades disponíveis — tenta do mais alto para o mais baixo */
const QUALIDADES = [
  { label: '4K',   width: 3840, height: 2160 },
  { label: '1080p', width: 1920, height: 1080 },
  { label: '720p',  width: 1280, height: 720  },
  { label: '480p',  width: 854,  height: 480  },
];

/* Escolhe o melhor codec disponível */
function melhorCodec() {
  const codecs = [
    'video/mp4;codecs=h264',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  return codecs.find((c) => MediaRecorder.isTypeSupported(c)) || '';
}

export default function GravadorVideo({ onGravado, onFechar }) {
  const [fase, setFase] = useState('idle'); // idle | gravando | preview
  const [qualidadeAtual, setQualidadeAtual] = useState('');
  const [tempo, setTempo] = useState(0);
  const [erro, setErro] = useState('');
  const [blobUrl, setBlobUrl] = useState(null);
  const [blobFinal, setBlobFinal] = useState(null);

  const videoRef    = useRef(null);
  const previewRef  = useRef(null);
  const streamRef   = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef   = useRef([]);
  const timerRef    = useRef(null);

  /* Abre câmera tentando 4K → 1080p → 720p → 480p */
  async function abrirCamera() {
    setErro('');
    for (const q of QUALIDADES) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width:       { ideal: q.width,  max: q.width  },
            height:      { ideal: q.height, max: q.height },
            frameRate:   { ideal: 60, max: 60 },
            facingMode:  'environment',
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 48000,
          },
        });
        streamRef.current = stream;
        setQualidadeAtual(q.label);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setFase('idle');
        return;
      } catch {
        // tenta qualidade inferior
      }
    }
    setErro('Não foi possível acessar a câmera. Verifique as permissões.');
  }

  useEffect(() => {
    abrirCamera();
    return () => pararStream();
  }, []);

  function pararStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    clearInterval(timerRef.current);
  }

  function iniciarGravacao() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const codec   = melhorCodec();
    const options = codec ? { mimeType: codec, videoBitsPerSecond: 40_000_000 } : {};
    const rec     = new MediaRecorder(streamRef.current, options);
    recorderRef.current = rec;

    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const mime = rec.mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: mime });
      const url  = URL.createObjectURL(blob);
      setBlobUrl(url);
      setBlobFinal(blob);
      setFase('preview');
      pararStream();
    };

    rec.start(1000); // coleta a cada 1s
    setFase('gravando');
    setTempo(0);
    timerRef.current = setInterval(() => setTempo((t) => t + 1), 1000);
  }

  function pararGravacao() {
    clearInterval(timerRef.current);
    recorderRef.current?.stop();
  }

  async function confirmar() {
    if (!blobFinal) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      onGravado(e.target.result); // base64 data URL
      URL.revokeObjectURL(blobUrl);
      onFechar();
    };
    reader.readAsDataURL(blobFinal);
  }

  function descartar() {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setBlobFinal(null);
    setFase('idle');
    abrirCamera();
  }

  function fechar() {
    pararStream();
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    onFechar();
  }

  const hms = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="gv-overlay" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div className="gv-modal">

        {/* Cabeçalho */}
        <div className="gv-header">
          <span className="gv-titulo">Gravar vídeo</span>
          {qualidadeAtual && <span className="gv-badge-q">{qualidadeAtual}</span>}
          <button type="button" className="gv-fechar" onClick={fechar}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {erro && <p className="gv-erro">{erro}</p>}

        {/* Preview da câmera */}
        {fase !== 'preview' && (
          <div className="gv-video-wrap">
            <video ref={videoRef} className="gv-video" muted playsInline autoPlay />
            {fase === 'gravando' && (
              <div className="gv-rec-indicator">
                <span className="gv-rec-dot" />
                REC {hms(tempo)}
              </div>
            )}
          </div>
        )}

        {/* Preview do vídeo gravado */}
        {fase === 'preview' && blobUrl && (
          <div className="gv-video-wrap">
            <video
              ref={previewRef}
              src={blobUrl}
              className="gv-video"
              controls
              playsInline
              autoPlay
            />
          </div>
        )}

        {/* Controles */}
        <div className="gv-controles">
          {fase === 'idle' && !erro && (
            <button type="button" className="gv-btn gv-btn--rec" onClick={iniciarGravacao}>
              <i className="bi bi-record-circle" /> Iniciar gravação
            </button>
          )}

          {fase === 'gravando' && (
            <button type="button" className="gv-btn gv-btn--stop" onClick={pararGravacao}>
              <i className="bi bi-stop-circle" /> Parar
            </button>
          )}

          {fase === 'preview' && (
            <>
              <button type="button" className="gv-btn gv-btn--descartar" onClick={descartar}>
                <i className="bi bi-arrow-counterclockwise" /> Regravar
              </button>
              <button type="button" className="gv-btn gv-btn--confirmar" onClick={confirmar}>
                <i className="bi bi-check-lg" /> Usar vídeo
              </button>
            </>
          )}

          {erro && (
            <button type="button" className="gv-btn gv-btn--rec" onClick={abrirCamera}>
              <i className="bi bi-arrow-clockwise" /> Tentar novamente
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
