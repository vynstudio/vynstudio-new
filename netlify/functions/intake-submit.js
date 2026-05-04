// Netlify Function — Vyn Studio prospect intake.
// Posts the intake brief into Telegram via @Vynstudio_bot.
// ENV VARS (set in Netlify dashboard):
//   TELEGRAM_BOT_TOKEN  = bot token from @BotFather
//   TELEGRAM_CHAT_ID    = chat/group id to receive briefs

const escMd = (s = '') => String(s).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
const line  = (label, value) => value ? `*${escMd(label)}:* ${escMd(value)}\n` : '';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let d;
  try { d = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return { statusCode: 500, body: 'Telegram not configured' };
  }

  const services = Array.isArray(d.services) ? d.services.join(', ') : d.services;
  const goals    = Array.isArray(d.goals)    ? d.goals.join(', ')    : d.goals;

  const text =
    `🚀 *Nuevo Lead — Vyn Studio*\n` +
    `_${escMd(d.fullName || 'sin nombre')} · ${escMd(d.businessName || '')}_\n` +
    `\n*👤 Contacto*\n` +
      line('Nombre', d.fullName) +
      line('Email', d.email) +
      line('Teléfono / WhatsApp', d.phone) +
      line('Cargo', d.role) +
    `\n*🏢 Negocio*\n` +
      line('Empresa', d.businessName) +
      line('Sector / Industria', d.industry) +
      line('Web actual', d.website) +
      line('Instagram', d.instagram) +
      line('Ubicación', d.location) +
      line('Tamaño del equipo', d.teamSize) +
    `\n*🎯 Objetivos*\n` +
      line('Objetivos', goals) +
      line('Servicios de interés', services) +
      line('Plazo / urgencia', d.timeline) +
      line('Presupuesto mensual', d.budget) +
    `\n*📊 Estado actual*\n` +
      line('¿Tiene web?', d.hasWebsite) +
      line('¿Hace ads?', d.runningAds) +
      line('Lo que funciona', d.whatsWorking) +
      line('Lo que NO funciona', d.whatsNotWorking) +
      line('Competencia / referencias', d.competitors) +
    `\n*💬 Más info*\n` +
      line('Cuéntanos sobre el proyecto', d.projectDetails) +
      line('Algo más', d.extra) +
      line('¿Cómo nos conociste?', d.source) +
    `\n_${escMd(d.submittedAt || new Date().toISOString())}_`;

  // Telegram message limit is 4096 chars — chunk by paragraph if needed.
  const chunks = [];
  let buf = '';
  for (const part of text.split('\n')) {
    if ((buf + '\n' + part).length > 3800) { chunks.push(buf); buf = part; }
    else { buf = buf ? buf + '\n' + part : part; }
  }
  if (buf) chunks.push(buf);

  try {
    for (const body of chunks) {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: body,
          parse_mode: 'MarkdownV2',
          disable_web_page_preview: true,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        console.error('Telegram error:', result);
        return { statusCode: 502, body: JSON.stringify(result) };
      }
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, chunks: chunks.length }) };
  } catch (err) {
    console.error('Telegram fetch error:', err);
    return { statusCode: 500, body: err.message };
  }
};
