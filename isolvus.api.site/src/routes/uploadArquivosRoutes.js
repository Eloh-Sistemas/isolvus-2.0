import { fileURLToPath } from "url";
import path from "path";
import express from "express";
import multer from "multer";
import {
  listarArquivosController,
  uploadArquivosController,
  excluirArquivoController,
} from "../controllers/uploadArquivosController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const storage = multer.memoryStorage(); // salva na memória
const upload = multer({ storage });

// Rotas principais
router.post("/uploadArquivo", upload.array("files"), uploadArquivosController);
router.get("/listarArquivos", listarArquivosController);

// Caminhos estáticos de download
const documentosPath = path.resolve(__dirname, "..", "documentos");
const remessasPath = path.resolve(__dirname, "..", "remessas");
router.use("/documentos", express.static(documentosPath));
router.use("/remessas", express.static(remessasPath));

router.delete("/excluirArquivo/:id_arquivo", excluirArquivoController);

export default router;
