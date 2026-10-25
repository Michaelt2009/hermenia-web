// ============================================================================
// WEBHOOK MERCADO PAGO - ACTIVACIÓN AUTOMÁTICA DE LICENCIAS HERMENIA
// ============================================================================
// Endpoint: POST /api/webhook-mercadopago
// Este archivo se ejecuta en los servidores seguros de Vercel.
// Utiliza la variable de entorno MERCADOPAGO_ACCESS_TOKEN configurada en Vercel.
// ============================================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ message: 'Webhook activo de Hermenia para Mercado Pago' });
  }

  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      console.warn('[MercadoPago Webhook] Aviso: MERCADOPAGO_ACCESS_TOKEN no configurado aún en Vercel.');
      return res.status(200).json({ status: 'warning', message: 'Token de Mercado Pago pendiente en Vercel.' });
    }

    const body = req.body || {};
    const query = req.query || {};

    // Obtener ID del pago
    const paymentId = body?.data?.id || query['data.id'] || query.id || body.id;
    const type = body?.type || query.type || query.topic;

    if (!paymentId || (type && type !== 'payment')) {
      return res.status(200).json({ status: 'ignored', message: 'Notificación ignorada (no es pago)' });
    }

    console.log(`[MercadoPago Webhook] Consultando detalles del pago #${paymentId}...`);

    // Consultar a la API oficial de Mercado Pago para verificar autenticidad
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!mpRes.ok) {
      console.error(`[MercadoPago Webhook] Error consultando pago ${paymentId}: HTTP ${mpRes.status}`);
      return res.status(200).json({ status: 'error', message: 'No se pudo verificar el pago' });
    }

    const payment = await mpRes.json();
    console.log(`[MercadoPago Webhook] Estado del pago #${paymentId}: ${payment.status}`);

    // Solo procesar si el estado es 'approved'
    if (payment.status !== 'approved') {
      return res.status(200).json({ status: payment.status, message: 'Pago aún no aprobado' });
    }

    // Datos del comprador
    const email = (payment.metadata?.user_email || payment.payer?.email || payment.external_reference || '').toLowerCase().trim();
    const planId = payment.metadata?.plan_id || 'vitalicia';
    const payerName = [payment.payer?.first_name, payment.payer?.last_name].filter(Boolean).join(' ') || 'Pastor / Investigador';

    if (!email) {
      console.warn(`[MercadoPago Webhook] Pago #${paymentId} aprobado pero sin correo asociado.`);
      return res.status(200).json({ status: 'warning', message: 'Pago aprobado sin correo' });
    }

    // Calcular fecha de vencimiento según el plan
    const ahora = new Date();
    let fechaVence = null;
    if (planId === 'mensual') {
      ahora.setDate(ahora.getDate() + 30);
      fechaVence = ahora.toISOString();
    } else if (planId === 'semestral') {
      ahora.setDate(ahora.getDate() + 180);
      fechaVence = ahora.toISOString();
    } else if (planId === 'anual') {
      ahora.setDate(ahora.getDate() + 365);
      fechaVence = ahora.toISOString();
    } else {
      // Vitalicia: año 2099
      fechaVence = '2099-12-31T23:59:59.000Z';
    }

    // Actualizar o crear usuario en Supabase con Licencia Activa
    const supabaseUrl = process.env.SUPABASE_URL || 'https://zukprpbsyycoxorkscfn.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_qlj0XZ-T68FxroJ8ILq7cQ_8N444yW8';

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const claveLicencia = `LIC-${planId.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { error: upsertErr } = await supabase.from('usuarios_registrados').upsert({
      email: email,
      nombre: payerName,
      licencia_tipo: planId,
      licencia_activa: true,
      licencia_key: claveLicencia,
      estado: 'activo',
      fecha_vencimiento: fechaVence,
      metodo_pago: 'mercadopago',
      transaccion_id: String(paymentId),
      fecha_actualizacion: new Date().toISOString()
    }, { onConflict: 'email' });

    if (upsertErr) {
      console.error('[MercadoPago Webhook] Error en Supabase upsert:', upsertErr);
    } else {
      console.log(`[MercadoPago Webhook] ✅ Licencia ${planId} activada exitosamente para: ${email}`);
    }

    return res.status(200).json({
      status: 'success',
      email,
      plan: planId,
      paymentId
    });

  } catch (err) {
    console.error('[MercadoPago Webhook] Error inesperado:', err);
    return res.status(200).json({ status: 'error', error: err.message });
  }
}
