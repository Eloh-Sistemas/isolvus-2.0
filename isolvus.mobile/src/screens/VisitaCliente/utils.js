export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatDateTime(date) {
  if (!(date instanceof Date)) return "";
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

export function formatDateDisplay(valor) {
  const txt = String(valor || "").trim();
  if (!txt) return "";
  const iso = txt.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (iso) {
    const [, yyyy, mm, dd, hh, min] = iso;
    return `${dd}/${mm}/${yyyy}  ${hh}:${min}`;
  }
  const br = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (br) {
    const [, dd, mm, yyyy, hh, min] = br;
    return `${dd}/${mm}/${yyyy}  ${hh}:${min}`;
  }
  return txt;
}

export function parseDateTimeBr(valor) {
  const txt = String(valor || "").trim();
  const m = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min, ss] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss));
}

export function formatarTelefone(telefone) {
  let t = String(telefone || "").replace(/\D/g, "");
  if (t.length === 11) return t.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (t.length === 10) return t.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return t;
}

export function formatarCgc(cgc) {
  let x = String(cgc || "").replace(/\D/g, "");
  if (x.length === 11) return x.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (x.length === 14) return x.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return x;
}

export function parseCoord(valor) {
  const txt = String(valor ?? "").replace(",", ".").trim();
  const n = Number(txt);
  return Number.isFinite(n) ? n : null;
}

export function isValidLatLng(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function haversineDistanceKm(coords1, coords2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const [lat1, lon1] = coords1;
  const [lat2, lon2] = coords2;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getRegionFromPoints(points, options = {}) {
  const minDelta = Number(options.minDelta) > 0 ? Number(options.minDelta) : 0.1;
  const paddingFactor = Number(options.paddingFactor) > 0 ? Number(options.paddingFactor) : 1.8;

  if (!Array.isArray(points) || points.length === 0) return null;

  if (points.length === 1) {
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      latitudeDelta: minDelta,
      longitudeDelta: minDelta,
    };
  }

  const latitudes = points.map((p) => p.latitude);
  const longitudes = points.map((p) => p.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * paddingFactor, minDelta),
    longitudeDelta: Math.max((maxLng - minLng) * paddingFactor, minDelta),
  };
}

export function extrairCamposFormulario(campos) {
  const ativo = new Set(
    (Array.isArray(campos) ? campos : [])
      .filter((c) => String(c?.ativo || "N").toUpperCase() === "S")
      .map((c) => Number(c.id_campo))
  );
  return {
    cpveterinario: ativo.has(3),
    cpitem: ativo.has(5),
    cpobservacao: ativo.has(6),
    cpvenda: ativo.has(7),
    cpfoto: ativo.has(8),
    cpequipe: ativo.has(9),
  };
}

export function highlightText(text, query) {
  if (!query || !text) return [{ text: String(text || ""), bold: false }];
  const lower = String(text).toLowerCase();
  const q = String(query).toLowerCase().trim();
  const idx = lower.indexOf(q);
  if (!q || idx === -1) return [{ text: String(text), bold: false }];
  return [
    { text: String(text).slice(0, idx), bold: false },
    { text: String(text).slice(idx, idx + q.length), bold: true },
    { text: String(text).slice(idx + q.length), bold: false },
  ];
}
