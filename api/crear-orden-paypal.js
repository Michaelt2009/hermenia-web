// ============================================================================
// API CREAR ORDEN PAYPAL - HERMENIA
// ============================================================================
// Endpoint: POST /api/crear-orden-paypal
// Este archivo se ejecuta en el backend seguro de Vercel.
// Utiliza las variables privadas PAYPAL_CLIENT_ID y PAYPAL_SECRET_KEY de Vercel.
// ============================================================================

const PLANES_USD = {
  mensual: {
    nombre: "Licencia Mensual Hermenia",
    precioUSD: 10
  },
  semestral: {
    nombre: "Licencia Semestral Hermenia",
    precioUSD: 50
  },
  anual: {
    nombre: "Licencia Pro Anual Hermenia",
    precioUSD: 100
  },
  vitalicia: {
    nombre: "Licencia Vitalicia Definitiva Hermenia",
    precioUSD: 250
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_SECRET_KEY || process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(200).json({
        configured: false,
        message: 'PAYPAL_CLIENT_ID o PAYPAL_SECRET_KEY no configurados aún en Vercel.'
      });
    }

    const { planId, email } = req.body || {};
    const plan = PLANES_USD[planId] || PLANES_USD.vitalicia;

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'hermenia.vercel.app';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${proto}://${host}`;

    // Obtener Token de Acceso de PayPal OAuth
    const authString = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');
    const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenRes.ok) {
      console.error('[PayPal API] Error obteniendo OAuth token:', await tokenRes.text());
      return res.status(500).json({ error: 'No se pudo autenticar con PayPal' });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Crear Orden en PayPal
    const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: planId || 'vitalicia',
            description: plan.nombre,
            custom_id: email || '',
            amount: {
              currency_code: 'USD',
              value: plan.precioUSD.toFixed(2)
            }
          }
        ],
        application_context: {
          brand_name: 'Hermenia Academic Suite',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${baseUrl}/?pago=exitoso&plan=${encodeURIComponent(planId || 'vitalicia')}`,
          cancel_url: `${baseUrl}/?pago=cancelado`
        }
      })
    });

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      console.error('[PayPal API] Error creando orden:', errText);
      return res.status(500).json({ error: 'Error creando orden PayPal', details: errText });
    }

    const orderData = await orderRes.json();
    const approveLink = (orderData.links || []).find(l => l.rel === 'approve')?.href;

    return res.status(200).json({
      configured: true,
      orderId: orderData.id,
      approveUrl: approveLink
    });

  } catch (err) {
    console.error('[PayPal API] Excepción:', err);
    return res.status(500).json({ error: 'Error del servidor', message: err.message });
  }
}
