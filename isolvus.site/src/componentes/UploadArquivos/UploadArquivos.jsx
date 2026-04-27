import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import api from "../../servidor/api";
import './UploadArquivos.css';
import imageCompression from "browser-image-compression";

const UploadArquivos = forwardRef((props, ref) => {
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [arquivosSalvos, setArquivosSalvos] = useState([]);  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    handleUpload,
    validarObrigatorio, // expõe para o pai a função de validação
  }));

  const validarObrigatorio = () => {
    if (props.required) {
      if (files.length === 0 && arquivosSalvos.length === 0) {
        return false; // inválido
      }
    }
    return true; // válido
  };

  async function compressImage(file, maxWidth = 1920, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxWidth / img.width, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          resolve(new File([blob], file.name, { type: file.type }));
        },
        file.type,
        quality
      );
    };
  });
}


  useEffect(() => {
    async function fetchArquivos() {
      try {
        const { data } = await api.get("/v1/listarArquivos", {
          params: {
            id_rotina: props.idRotina,
            id_relacional: props.idRelacional,
            id_grupo_empresa: localStorage.getItem("id_grupo_empresa")
          },
        });

        const urls = data.map(item => ({
          url: item[0],
          id_arquivo: item[1]
        }));  

        setArquivosSalvos(urls);
      } catch (err) {
        console.error("Erro ao buscar arquivos:", err);
      }
    }

    if (props.idRotina && props.idRelacional) {
      fetchArquivos();
    }
    
  }, [props.idRotina, props.idRelacional]);

  const handleFileChange = async (e) => {
  const selectedFiles = Array.from(e.target.files);

  // 🧩 Comprime apenas imagens antes de criar os previews
  const compressedFiles = await Promise.all(
    selectedFiles.map(async (file) => {
      if (file.type.startsWith("image/")) {
        // compacta imagem
        return await compressImage(file, 1920, 0.8);
      }
      // se não for imagem, retorna o arquivo original
      return file;
    })
  );

  // 🔄 Atualiza o estado com os arquivos (compactados ou originais)
  setFiles((prev) => [...prev, ...compressedFiles]);

  // 🖼️ Cria os previews com base nos arquivos (já compactados)
  const previewUrls = compressedFiles.map((file) => {
    const isImage = file.type.startsWith("image/");
    return {
      url: isImage ? URL.createObjectURL(file) : null,
      name: file.name,
      isImage
    };
  });

  setPreviews((prev) => [...prev, ...previewUrls]);
};


  const handleChooseFile = () => {
    if (!props.disabled) {
      fileInputRef.current.click();
    }
  };

  const handleRemoverPreview = (index) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("id_rotina", props.idRotina);
    formData.append("id_relacional", props.idRelacional);
    formData.append("id_grupo_empresa", localStorage.getItem("id_grupo_empresa"));

    try {
      const resposta = await api.post("/v1/uploadArquivo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFiles([]);
      setPreviews([]);

      const novosArquivos = resposta.data.map(item => ({
        url: item[0],
        id_arquivo: item[1]
      }));

      setArquivosSalvos(novosArquivos);
    } catch (error) {
      alert("Erro ao enviar arquivos");
      console.log(error);
    }
  };

  const handleExcluirArquivo = async (id_arquivo) => {
    try {
      await api.delete(`/v1/excluirArquivo/${id_arquivo}`);
      setArquivosSalvos(prev => prev.filter(arquivo => arquivo.id_arquivo !== id_arquivo));
    } catch (error) {
      alert("Erro ao excluir arquivo.");
      console.error(error);
    }
  };

 const openModal = (clickedIndex) => {
  // Todas imagens, tanto salvas quanto previews
  const todasImagens = [
    ...arquivosSalvos.filter((a) => isImageFile(a.url)),
    ...previews.filter((p) => p.isImage)
  ];

  // Determina a imagem clicada com base no índice real passado (já filtrado por imagens)
  const imagemClicada = todasImagens[clickedIndex];
  if (!imagemClicada) return;

  setCurrentImageIndex(clickedIndex);
  setIsModalOpen(true);
};




  const closeModal = () => {
    setIsModalOpen(false);

    // 🧹 Libera a memória ocupada pelos previews
    previews.forEach((item) => URL.revokeObjectURL(item.url));
  };

  const showNextImage = () => {
    const totalImagens = arquivosSalvos.length + previews.length;
    if (currentImageIndex < totalImagens - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const showPrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const isImageFile = (url) => {
    return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url);
  };

  const getExtClass = (url) => {
    const ext = url.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf': return 'pdf';
      case 'doc': case 'docx': return 'word';
      case 'xls': case 'xlsx': return 'excel';
      case 'ppt': case 'pptx': return 'ppt';
      case 'zip': case 'rar': return 'zip';
      default: return '';
    }
  };

  const getIconByExtension = (url) => {
    const ext = url.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf': return 'bi bi-file-earmark-pdf';
      case 'doc':
      case 'docx': return 'bi bi-file-earmark-word';
      case 'xls':
      case 'xlsx': return 'bi bi-file-earmark-excel';
      case 'ppt':
      case 'pptx': return 'bi bi-file-earmark-slides';
      case 'txt': return 'bi bi-file-earmark-text';
      case 'zip':
      case 'rar': return 'bi bi-file-earmark-zip';
      default: return 'bi bi-file-earmark';
    }
  };

  const getAllImageUrls = () => {
  const savedImages = arquivosSalvos.filter((a) => isImageFile(a.url)).map((a) => a.url);
  const previewImages = previews.filter((p) => p.isImage).map((p) => p.url);
  return [...savedImages, ...previewImages];
};

const totalImagens = () => getAllImageUrls().length;


  // Função para forçar download sem abrir nova aba
  const handleDownload = async (url) => {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error('Erro ao baixar arquivo');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = downloadUrl;

      const fileName = url.split('/').pop().split('?')[0];
      link.download = decodeURIComponent(fileName);

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(link);
      }, 100);

    } catch (error) {
      alert('Erro ao baixar arquivo');
      console.error(error);
    }
  };

  return (
    <>
      <input
        type="file"
        multiple={!props.capture}
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
        accept={props.acceptTypes}
        {...(props.capture ? { capture: "environment" } : {})}
      />

      {/* Zona de upload */}
      {!props.disabled && (
        <div className="upload-zone" onClick={handleChooseFile}>
          <i className="bi bi-cloud-upload upload-zone-icon"></i>
          <span className="upload-zone-text">Clique para adicionar arquivos</span>
          <span className="upload-zone-hint">Imagens, PDFs, documentos e mais</span>
        </div>
      )}

      {/* Cabeçalho da seção */}
      {(arquivosSalvos.length > 0 || previews.length > 0) && (
        <div className="upload-section-header">
          <span className="upload-section-title">Arquivos</span>
          <span className="upload-section-count">
            {arquivosSalvos.length + previews.length} arquivo{(arquivosSalvos.length + previews.length) !== 1 ? 's' : ''}
            {previews.length > 0 && (
              <span className="upload-pending-info"> · {previews.length} pendente{previews.length !== 1 ? 's' : ''}</span>
            )}
          </span>
        </div>
      )}

      {/* Grid de arquivos ou empty state */}
      {(arquivosSalvos.length > 0 || previews.length > 0) ? (
        <div className="files-grid">
          {arquivosSalvos.map((arquivo, index) => {
            const isImage = isImageFile(arquivo.url);
            const nomeArquivo = decodeURIComponent(arquivo.url.split("/").pop());

            return (
              <div
                key={`salvo-${index}`}
                className={`file-card ${isImage ? 'is-image' : ''}`}
                onClick={() => isImage && openModal(index)}
              >
                <div className="file-card-thumb">
                  {isImage ? (
                    <img loading="lazy" src={arquivo.url} alt={nomeArquivo} />
                  ) : (
                    <i className={`${getIconByExtension(arquivo.url)} file-type-icon ${getExtClass(arquivo.url)}`}></i>
                  )}
                </div>

                {!props.disabled && (
                  <button
                    className="file-card-remove btn btn-sm btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExcluirArquivo(arquivo.id_arquivo);
                    }}
                    title="Excluir"
                  >
                    <i className="bi bi-trash-fill"></i>
                  </button>
                )}

                <div className="file-card-body">
                  <div className="file-card-name" title={nomeArquivo}>{nomeArquivo}</div>
                  <div className="file-card-actions">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDownload(arquivo.url);
                      }}
                      className="btn btn-sm btn-outline-primary"
                      title="Download"
                    >
                      <i className="bi bi-download"></i> Baixar
                    </a>
                  </div>
                </div>
              </div>
            );
          })}

          {previews.map((preview, index) => {
            const nomeArquivo = preview.name;
            return (
              <div
                key={`preview-${index}`}
                className={`file-card ${preview.isImage ? 'is-image' : ''}`}
                onClick={() => preview.isImage && openModal(index + arquivosSalvos.filter(a => isImageFile(a.url)).length)}
              >
                <div className="file-card-thumb">
                  {preview.isImage ? (
                    <img loading="lazy" src={preview.url} alt={nomeArquivo} />
                  ) : (
                    <i className={`${getIconByExtension(preview.name)} file-type-icon ${getExtClass(preview.name)}`}></i>
                  )}
                </div>

                <span className="file-card-pending-badge">Pendente</span>

                {!props.disabled && (
                  <button
                    className="file-card-remove btn btn-sm btn-warning"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoverPreview(index);
                    }}
                    title="Remover"
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                )}

                <div className="file-card-body">
                  <div className="file-card-name" title={nomeArquivo}>{nomeArquivo}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="files-empty-state">
          <i className="bi bi-paperclip"></i>
          Nenhum arquivo anexado
        </div>
      )}

      {/* Lightbox */}
      {isModalOpen && (
        <div className="lightbox-overlay" onClick={closeModal}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={closeModal}>
              <i className="bi bi-x"></i>
            </button>

            {totalImagens() > 1 && (
              <>
                <button
                  className="lightbox-nav prev"
                  onClick={showPrevImage}
                  disabled={currentImageIndex === 0}
                >
                  ❮
                </button>
                <button
                  className="lightbox-nav next"
                  onClick={showNextImage}
                  disabled={currentImageIndex === totalImagens() - 1}
                >
                  ❯
                </button>
              </>
            )}

            <img
              src={getAllImageUrls()[currentImageIndex]}
              alt={`Imagem ${currentImageIndex + 1}`}
              className="lightbox-image"
              loading="lazy"
            />

            {totalImagens() > 1 && (
              <div className="lightbox-counter">
                {currentImageIndex + 1} / {totalImagens()}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});

export default UploadArquivos;
