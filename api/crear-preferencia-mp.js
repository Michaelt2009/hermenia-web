// ============================================================================
// API CREAR PREFERENCIA MERCADO PAGO - HERMENIA
// ============================================================================
// Endpoint: POST /api/crear-preferencia-mp
// Este archivo se ejecuta en el backend seguro de Vercel.
// Utiliza la variable privada MERCADOPAGO_ACCESS_TOKEN de Vercel.
// NUNCA expone el Access Token al navegador.
// ============================================================================

const PLANES_OFICIALES = {
  mensual: {
    nombre: "Licencia Mensual Hermenia",
    precioCOP: 41000,
    descripcion: "Suscripción mensual para análisis bíblico y taller homilético."
  },
  semestral: {
    nombre: "Licencia Semestral Hermenia",
    precioCOP: 205000,
    descripcion: "Acceso semestral con todas las funciones e investigación académica."
  },
  anual: {
    nombre: "Licencia Pro Anual Hermenia",
    precioCOP: 410000,
    descripcion: "Suscripción anual preferida por pastores y maestros de la Palabra."
  },
  vitalicia: {
    nombre: "Licencia Vitalicia Definitiva Hermenia",
    precioCOP: 1025000,
    descripcion: "Acceso perpetuo de por vida a Hermenia Academic Suite."
  }
};

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken || accessToken.trim() === '') {
      return res.status(200).json({
        configured: false,
        message: 'MERCADOPAGO_ACCESS_TOKEN no configurado aún en Vercel.'
      });
    }

    const { planId, email, nombre } = req.body || {};
    const plan = PLANES_OFICIALES[planId] || PLANES_OFICIALES.vitalicia;

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'hermenia.vercel.app';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${proto}://${host}`;

    const preferenceData = {
      items: [
        {
          id: planId || 'vitalicia',
          title: plan.nombre,
          description: plan.descripcion,
          quantity: 1,
          currency_id: 'COP',
          unit_price: Number(plan.precioCOP)
        }
      ],
      payer: {
        email: email || undefined,
        name: nombre || undefined
      },
      external_reference: email || undefined,
      metadata: {
        user_email: email || '',
        plan_id: planId || 'vitalicia'
      },
      back_urls: {
        success: `${baseUrl}/?pago=exitoso&plan=${encodeURIComponent(planId || 'vitalicia')}`,
        failure: `${baseUrl}/?pago=fallido`,
        pending: `${baseUrl}/?pago=pendiente`
      },
      auto_return: 'approved',
      notification_url: `${baseUrl}/api/webhook-mercadopago`
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferenceData)
    });

    if (!mpRes.ok) {
      const errBody = await mpRes.text();
      console.error('[MercadoPago API] Error creando preferencia:', errBody);
      return res.status(500).json({
        error: 'Error en API de Mercado Pago',
        details: errBody
      });
    }

    const mpData = await mpRes.json();

    return res.status(200).json({
      configured: true,
      preferenceId: mpData.id,
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point
    });

  } catch (err) {
    console.error('[MercadoPago API] Excepción:', err);
    return res.status(500).json({ error: 'Error del servidor', message: err.message });
  }
}
