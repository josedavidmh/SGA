import React, { useState } from 'react';
import { 
  Download, 
  FileCode2, 
  Github, 
  Check, 
  Copy, 
  ExternalLink, 
  X, 
  ShieldCheck, 
  Users,
  FolderArchive,
  Layers,
  Sparkles
} from 'lucide-react';
import JSZip from 'jszip';
import { USUARIOS_INICIALES } from '../mockData';

interface DescargarStandaloneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DescargarStandaloneModal: React.FC<DescargarStandaloneModalProps> = ({
  isOpen,
  onClose
}) => {
  const [descargando, setDescargando] = useState(false);
  const [copiadoIdx, setCopiadoIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const copiarCredencial = (texto: string, idx: number) => {
    navigator.clipboard.writeText(texto);
    setCopiadoIdx(idx);
    setTimeout(() => setCopiadoIdx(null), 2000);
  };

  const handleDescargarZip = async () => {
    try {
      setDescargando(true);
      const zip = new JSZip();

      // Obtener o cargar los archivos desde /standalone/
      let indexHtml = '';
      let styleCss = '';
      let appJs = '';
      let readmeMd = '';

      try {
        const [resHtml, resCss, resJs, resMd] = await Promise.all([
          fetch('/standalone/index.html').then(r => r.text()),
          fetch('/standalone/style.css').then(r => r.text()),
          fetch('/standalone/app.js').then(r => r.text()),
          fetch('/standalone/README.md').then(r => r.text())
        ]);
        indexHtml = resHtml;
        styleCss = resCss;
        appJs = resJs;
        readmeMd = resMd;
      } catch (err) {
        console.warn('Fallo al obtener archivos por fetch, usando respaldo embebido', err);
      }

      // Si no cargaron por fetch, aseguramos el contenido mínimo funcional
      if (!indexHtml || indexHtml.length < 50) {
        indexHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Gestión Académica</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div id="view-container">Cargando Sistema Standalone...</div>
  <script src="app.js"></script>
</body>
</html>`;
      }

      zip.file('index.html', indexHtml);
      zip.file('style.css', styleCss);
      zip.file('app.js', appJs);
      zip.file('README.md', readmeMd || `# Sistema de Gestión Académica - Versión Standalone\nConsulte las instrucciones en index.html`);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sena-gestion-academica-standalone-github.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al generar el ZIP:', error);
      alert('Ocurrió un error al preparar la descarga. Los archivos están disponibles en la carpeta /standalone del proyecto.');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#0D631B] flex items-center justify-center font-bold border border-emerald-200/60 shadow-xs">
              <Github className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-[#0D631B] uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Listo para Subir a GitHub y Ejecutar</span>
              </div>
              <h3 className="text-lg font-black text-[#111C2D]">
                Versión Descargable (HTML, CSS, JS + README.md)
              </h3>
              <p className="text-xs text-slate-500">
                Paquete estático autónomo con usuarios semilla para pruebas sin necesidad de Node.js ni compilación.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo Scrollable */}
        <div className="overflow-y-auto py-5 space-y-6 pr-1">
          {/* Botones de Acción Primaria */}
          <div className="bg-emerald-50/60 rounded-2xl p-4 sm:p-5 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-[#0D631B] flex items-center space-x-2">
                <FolderArchive className="w-4 h-4" />
                <span>Descargar Paquete ZIP Completo</span>
              </h4>
              <p className="text-xs text-slate-600 mt-1 max-w-md">
                Incluye <strong>index.html</strong>, <strong>style.css</strong>, <strong>app.js</strong> y <strong>README.md</strong> estructurados para doble clic local o despliegue en GitHub Pages.
              </p>
            </div>
            <div className="flex items-center space-x-2.5 w-full sm:w-auto shrink-0">
              <a
                href="/standalone/index.html"
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-initial py-2.5 px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-[#111C2D] flex items-center justify-center space-x-1.5 shadow-xs transition-colors"
                title="Abrir la versión standalone directamente en una nueva pestaña"
              >
                <span>Probar en vivo</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </a>

              <a
                href="/sena-standalone.zip"
                download="sena-gestion-academica-standalone.zip"
                className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-[#0D631B] hover:bg-[#0a4d15] text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition-all hover:scale-105"
                title="Descargar paquete comprimido ZIP"
              >
                <Download className="w-4 h-4" />
                <span>Descargar ZIP</span>
              </a>
            </div>
          </div>

          {/* Tabla de Usuarios Semilla */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-[#005A8C]" />
                <h4 className="text-xs font-bold text-[#111C2D] uppercase tracking-wide">
                  Usuarios Semilla para Pruebas (Credenciales)
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                Haga clic en el icono para copiar correo o clave
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">ROL</th>
                    <th className="py-2.5 px-3">NOMBRE</th>
                    <th className="py-2.5 px-3">CORREO</th>
                    <th className="py-2.5 px-3">CONTRASEÑA</th>
                    <th className="py-2.5 px-3 text-right">COPIAR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {USUARIOS_INICIALES.map((user, idx) => (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          user.rol === 'COORDINADOR' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                          user.rol === 'INSTRUCTOR_LIDER' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          user.rol === 'ADMINISTRADOR' ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                          'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {user.rol}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{user.nombre_completo}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{user.cargo}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-blue-700">
                        {user.correo}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-700 font-bold">
                        {user.clave}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => copiarCredencial(`${user.correo} | ${user.clave}`, idx)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 inline-flex items-center space-x-1"
                          title="Copiar correo y clave"
                        >
                          {copiadoIdx === idx ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pasos para Subir a GitHub */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5 text-xs text-slate-600">
            <div className="font-bold text-slate-800 flex items-center space-x-1.5">
              <Github className="w-4 h-4 text-slate-700" />
              <span>Instrucciones de Publicación en GitHub / GitHub Pages:</span>
            </div>
            <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed">
              <li>Descomprima el archivo <strong>.zip</strong> o clone el repositorio.</li>
              <li>Suba los archivos a su repositorio de GitHub (incluye el <strong>README.md</strong> ya formateado).</li>
              <li>En GitHub, vaya a <strong>Settings &gt; Pages</strong> y seleccione la rama <code>main</code> como fuente.</li>
              <li>¡Listo! La aplicación se desplegará en línea de inmediato con soporte para todos los roles y fichas.</li>
            </ol>
          </div>
        </div>

        {/* Pie */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            2026
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
